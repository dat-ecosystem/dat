var path = require('path')
var walker = require('folder-walker')
var hyperdrive = require('hyperdrive')
var speedometer = require('speedometer')
var pump = require('pump')
var each = require('stream-each')
var through = require('through2')
var subLevel = require('subleveldown')
var discoverySwarm = require('discovery-swarm')

module.exports = Dat

var DEFAULT_PORT = 3282
var DEFAULT_DISCOVERY = [
  'discovery1.publicbits.org',
  'discovery2.publicbits.org'
]
var DAT_DOMAIN = 'dat.local'

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  this.fs = opts.fs || require('./fs.js')
  this.level = opts.db || require('./db.js')(opts)
  var drive = hyperdrive(this.level)
  this.drive = drive
  this.allPeers = {}
  this.blacklist = {}

  var discovery = opts.discovery !== false
  this.swarm = discoverySwarm({
    id: drive.core.id,
    dns: discovery && {server: DEFAULT_DISCOVERY, domain: DAT_DOMAIN},
    dht: discovery,
    stream: function () {
      return drive.createPeerStream()
    }
  })
  this._listening = false
}

Dat.DNS_SERVERS = DEFAULT_DISCOVERY

Dat.prototype.scan = function (dirs, onEach, cb) {
  var stream = walker(dirs, {filter: function (data) {
    if (path.basename(data) === '.dat') return false
    return true
  }})

  each(stream, function (data, next) {
    var prefix = path.resolve(data.filepath) !== path.resolve(data.root)
    var dirname = path.basename(data.root)
    var item = {
      name: prefix ? path.join(dirname, data.relname) : data.relname,
      path: path.resolve(data.filepath),
      mode: data.stat.mode,
      uid: data.stat.uid,
      gid: data.stat.gid,
      mtime: data.stat.mtime.getTime(),
      ctime: data.stat.ctime.getTime(),
      size: data.stat.size
    }

    var isFile = data.stat.isFile()
    if (isFile) {
      item.type = 'file'
    }
    var isDir = data.stat.isDirectory()
    if (isDir) item.type = 'directory'
    onEach(item, next)
  }, cb)
}

Dat.prototype.fileStats = function (dirs, cb) {
  this.scan(dirs, eachItem, done)

  var totalStats = {
    filesTotal: 0,
    directories: 0,
    bytesTotal: 0,
    latest: null
  }

  function eachItem (item, next) {
    if (item.type === 'file') {
      totalStats.filesTotal++
      totalStats.bytesTotal += item.size
      if (item.mtime > totalStats.latest) totalStats.latest = item.mtime
    } else if (item.type === 'directory') {
      totalStats.directories++
    }
    next()
  }

  function done (err) {
    if (err) return cb(err)
    cb(null)
  }

  return totalStats
}

Dat.prototype.addFiles = function (dirs, cb) {
  var archive = this.drive.add('.')
  this.scan(dirs, eachItem, done)

  var stats = {
    progress: {
      bytesRead: 0,
      bytesDownloaded: 0,
      filesRead: 0,
      filesDownloaded: 0
    },
    uploaded: {
      bytesRead: 0
    },
    fileQueue: []
  }

  stats.uploadRate = speedometer()
  trackUpload(stats, archive)

  return stats

  function eachItem (item, next) {
    var appendStats = archive.appendFile(item.path, item.name, next)
    // This could accumulate too many objects if
    // logspeed is slow & scanning many files.
    if (item.type === 'file') {
      stats.fileQueue.push({
        name: item.name,
        stats: appendStats
      })
      appendStats.on('end', function () {
        stats.progress.filesRead += 1
        stats.progress.bytesRead += appendStats.bytesRead
      })
    }
  }

  function done (err) {
    if (err) return cb(err)
    archive.finalize(function (err) {
      if (err) return cb(err)
      var link = archive.id.toString('hex')
      cb(null, link)
      // TODO archive cleanup
    })
  }
}

Dat.prototype.joinTcpSwarm = function (opts, cb) {
  var self = this
  if (typeof opts === 'string') opts = {link: opts}
  var link = opts.link
  link = link.replace('dat://', '').replace('dat:', '')
  var key = new Buffer(link, 'hex')
  var metaLevel = subLevel(this.level, 'metadata')

  this.swarm.once('listening', function () {
    self.swarm.link = link // backwards compat
    self.swarm.join(key)
    metaLevel.put(link + '-port', self.swarm.address().port)
    cb(null, self.swarm)
  })

  this.swarm.once('error', function (err) {
    if (err.code === 'EADDRINUSE') self.swarm.listen(0) // asks OS for first open port
    else throw err
  })

  if (opts.port) return swarmListen()
  metaLevel.get(link + '-port', function (err, value) {
    if (err && err.notFound) return swarmListen() // no old port
    if (err) return cb(err)
    opts.port = Number(value)
    swarmListen()
  })

  function swarmListen () {
    if (!self._listening) {
      self._listening = true
      self.swarm.listen(opts.port || DEFAULT_PORT)
    } else {
      cb(null, self.swarm)
    }
  }
}

Dat.prototype.close = function (cb) {
  this.drive.core.db.close()
  this.swarm.destroy(cb)
}

// returns object that is used to render progress bars
Dat.prototype.download = function (link, dir, opts, cb) {
  var self = this
  if ((typeof opts) === 'function') return this.download(link, dir, {}, opts)
  if (!opts) opts = {}
  if (!cb) cb = function noop () {}

  var stats = {
    progress: {
      bytesRead: 0,
      filesRead: 0
    },
    total: {
      bytesTotal: 0,
      filesTotal: 0,
      directories: 0
    },
    uploaded: {
      bytesRead: 0
    },
    fileQueue: []
  }

  self.joinTcpSwarm(link, function (err, swarm) {
    if (err) return cb(err)
    swarm.downloading = true
    stats.downloadRate = speedometer()
    stats.uploadRate = speedometer()
    stats.swarm = swarm
    var archive = self.drive.get(swarm.link, dir)

    trackUpload(stats, archive)

    archive.ready(function (err) {
      if (err) return cb(err)
      swarm.gettingMetadata = true
      var download = self.fs.createDownloadStream(archive, stats, opts)
      var counter = through.obj(function (item, enc, next) {
        if (typeof stats.parentFolder === 'undefined') {
          var segments = item.name.split(path.sep)
          if (segments.length === 1 && item.type === 'file') stats.parentFolder = false
          else stats.parentFolder = segments[0]
        }
        stats.total.bytesTotal += item.size
        if (item.type === 'file') stats.total.filesTotal++
        else stats.total.directories++
        next(null)
      })
      pump(archive.createEntryStream(), counter, function (err) {
        if (err) return cb(err)
        swarm.hasMetadata = true
        downloadStream()
      })

      function downloadStream () {
        pump(archive.createEntryStream(), download, function (err) {
          cb(err, swarm)
        })
      }
    })

    archive.on('file-download', function (entry, data, block) {
      stats.progress.bytesRead += data.length
      stats.downloadRate(data.length)
    })
  })

  return stats
}

function trackUpload (stats, archive) {
  archive.on('file-upload', function (entry, data) {
    stats.uploaded.bytesRead += data.length
    stats.uploadRate(data.length)
  })
}
