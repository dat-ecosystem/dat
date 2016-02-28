var path = require('path')
var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var speedometer = require('speedometer')
var pump = require('pump')
var through = require('through2')
var webrtcSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var series = require('run-series')
var subLevel = require('subleveldown')
var discoverySwarm = require('discovery-swarm')
var debug = require('debug')('dat')

module.exports = Dat

var DEFAULT_PORT = 3282
var DEFAULT_DISCOVERY = [
  'discovery1.publicbits.org',
  'discovery2.publicbits.org'
]

var DEFAULT_SIGNALHUB = 'https://signalhub.publicbits.org'
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

Dat.prototype.scan = function (dirs, each, done) {
  var self = this

  if (!Array.isArray(dirs)) dirs = [dirs]

  var tasks = dirs.map(function (dir) {
    return function (cb) {
      self.fs.listEach({dir: dir}, each, cb)
    }
  })

  series(tasks, function (err) {
    if (err) return done(err)
    done()
  })
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

Dat.prototype.metadata = function (link, cb) {
  var self = this
  var archive = self.drive.get(link)
  var stream = archive.createEntryStream()

  var res = {
    size: 0
  }

  stream.on('data', function (entry) {
    res.size += entry.size
  })

  stream.on('error', cb)
  stream.on('end', function () {
    cb(null, res)
  })
}

Dat.prototype.addFiles = function (dirs, cb) {
  var pack = this.drive.add('.')
  this.scan(dirs, eachItem, done)

  var stats = {
    'progress': pack.stats,
    'fileQueue': []
  }

  return stats

  function eachItem (item, next) {
    var appendStats = pack.appendFile(item.path, item.name, next)
    // This could accumulate too many objects if
    // logspeed is high & scanning many files.
    if (item.type === 'file') {
      stats.fileQueue.push({
        name: item.name,
        stats: appendStats
      })
    }
  }

  function done (err) {
    if (err) return cb(err)
    pack.finalize(function (err) {
      if (err) return cb(err)
      var link = pack.id.toString('hex')
      cb(null, link)
      // TODO pack cleanup
    })
  }
}

Dat.prototype.joinWebrtcSwarm = function (link, opts) {
  if (!opts) opts = {}
  opts.signalhub = opts.signalhub || DEFAULT_SIGNALHUB
  var self = this
  link = link.replace('dat://', '').replace('dat:', '')
  var key = link.toString('hex')
  var hub = signalhub('hyperdrive/' + key, [opts.signalhub])
  var swarm = webrtcSwarm(hub, opts)

  swarm.on('peer', function (peer) {
    pump(peer, self.drive.createPeerStream(), peer, function () {
      debug('found a peer for', link, peer)
    })
  })

  return swarm
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

Dat.prototype.metadata = function (link, cb) {
  var self = this
  var archive = self.drive.get(link)
  collect(archive.createEntryStream(), cb)
}

// returns object that is used to render progress bars
Dat.prototype.download = function (link, dir, cb) {
  var self = this
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
    fileQueue: []
  }

  self.joinTcpSwarm(link, function (err, swarm) {
    if (err) return cb(err)
    swarm.downloading = true
    stats.downloadRate = speedometer()
    stats.swarm = swarm
    var archive = self.drive.get(swarm.link, dir)

    archive.ready(function (err) {
      if (err) return cb(err)
      swarm.gettingMetadata = true
      var download = self.fs.createDownloadStream(archive, stats)
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
