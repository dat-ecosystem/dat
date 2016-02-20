var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var speedometer = require('speedometer')
var pump = require('pump')
var webrtcSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var series = require('run-series')
var discoverySwarm = require('discovery-swarm')
var debug = require('debug')('dat')

module.exports = Dat

var DEFAULT_PORT = 3282
var DEFAULT_DISCOVERY = ['discovery.publicbits.org', 'discovery.publicbits.org:5300']
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
    dns: discovery && {server: DEFAULT_DISCOVERY, domain: DAT_DOMAIN},
    dht: discovery,
    stream: function () {
      return drive.createPeerStream()
    }
  })
}

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

  var stats = {
    files: 0,
    directories: 0,
    size: 0,
    latest: null
  }

  function eachItem (item, next) {
    if (item.type === 'file') {
      stats.files++
      stats.size += item.size
      if (item.mtime > stats.latest) stats.latest = item.mtime
    } else if (item.type === 'directory') {
      stats.directories++
    }
    next()
  }

  function done (err) {
    if (err) return cb(err)
    cb(null, stats)
  }

  return stats
}

Dat.prototype.addFiles = function (dirs, cb) {
  var pack = this.drive.add('.')
  this.scan(dirs, eachItem, done)

  var stats = {
    progressStats: pack.stats,
    files: []
  }

  return stats

  function eachItem (item, next) {
    var appendStats = pack.appendFile(item.path, item.name, next)
    // This could accumulate too many objects if
    // logspeed is high & scanning many files.
    if (item.type === 'file') {
      stats.files.push({
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

  this.swarm.once('listening', function () {
    self.swarm.link = link // backwards compat
    self.swarm.add(key)
    cb(null, self.swarm)
  })

  this.swarm.once('error', function (err) {
    if (err.code === 'EADDRINUSE') self.swarm.listen(0) // asks OS for first open port
    else throw err
  })

  this.swarm.listen(opts.port || DEFAULT_PORT)
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
    progressStats: {},
    totalStats: {},
    files: []
  }

  self.joinTcpSwarm(link, function (err, swarm) {
    if (err) return cb(err)
    swarm.downloading = true
    stats.downloadRate = speedometer()
    stats.downloaded = 0
    stats.swarm = swarm
    var archive = self.drive.get(swarm.link, dir)

    archive.ready(function (err) {
      if (err) return cb(err)
      stats.progressStats = archive.stats
      stats.totalStats.filesTotal = archive.entries
      var download = self.fs.createDownloadStream(archive, stats)
      pump(archive.createEntryStream(), download, function (err) {
        cb(err, swarm)
      })
    })

    archive.on('file-download', function (entry, data, block) {
      stats.downloadRate(data.length)
    })
  })

  return stats
}
