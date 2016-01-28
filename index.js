var os = require('os')
var net = require('net')
var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var speedometer = require('speedometer')
var pump = require('pump')
var webrtcSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var series = require('run-series')
var discoveryChannel = require('discovery-channel')
var connections = require('connections')
var debug = require('debug')('dat')

module.exports = Dat

var DEFAULT_PORT = 3282
var DEFAULT_DISCOVERY = 'discovery.publicbits.org'
var DEFAULT_SIGNALHUB = 'https://signalhub.publicbits.org'

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  this.fs = opts.fs || require('./fs.js')
  this.level = opts.db || require('./db.js')(opts)
  var drive = hyperdrive(this.level)
  this.drive = drive
  this.allPeers = {}
  this.blacklist = {}
  if (opts.discovery !== false) this.discovery = discoveryChannel({dns: {server: DEFAULT_DISCOVERY}})
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
    files: 0
  }

  return stats

  function eachItem (item, next) {
    pack.appendFile(item.path, item.name, function (err) {
      if (err) return next(err)
      if (item.type === 'file') stats.files++
      next()
    })
  }

  function done () {
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

Dat.prototype.joinTcpSwarm = function (link, cb) {
  var self = this
  link = link.replace('dat://', '').replace('dat:', '')
  var activeInboundPeers = {}

  var server = net.createServer(function (socket) {
    var peerStream = self.drive.createPeerStream()
    pump(socket, peerStream, socket, function () {
      var remoteId = peerStream.remoteId
      if (!remoteId) return
      remoteId = remoteId.toString('hex')
      delete activeInboundPeers[remoteId]
    })
    peerStream.on('handshake', function () {
      var remoteId = peerStream.remoteId.toString('hex')
      debug('handshake from remote', remoteId)
      activeInboundPeers[remoteId] = true
    })
  })

  var inboundConnections = connections(server)

  server.on('listening', function () {
    var swarm = {
      port: server.address().port,
      hash: resolveHash(link),
      link: link,
      close: close,
      server: server,
      inboundConnections: inboundConnections,
      activeOutboundPeers: {},
      activeInboundPeers: activeInboundPeers,
      dat: self,
      peerCount: 0,
      blocks: null,
      downloading: false,
      downloadComplete: false
    }

    self.discovery.add(swarm.hash, swarm.port)

    self.discovery.on('peer', function (hash, peer) {
      debug('peer discovery', link, peer)
      var peerid = peer.host + ':' + peer.port
      if (isLocalPeer(peer) && peer.port === swarm.port) return // ignore self
      if (self.blacklist.hasOwnProperty(peerid)) return // ignore blacklist
      if (!self.allPeers.hasOwnProperty(peerid)) swarm.peerCount++
      self.allPeers[peerid] = true
      var socket = net.connect(peer.port, peer.host)
      var peerStream = self.drive.createPeerStream()
      peerStream.on('handshake', function () {
        var remoteId = peerStream.remoteId.toString('hex')
        var id = peerStream.id.toString('hex')
        if (remoteId === id) { // peer === you
          debug('peer is self, blacklisting', remoteId)
          socket.destroy()
          self.blacklist[peerid] = true
        } else {
          debug('handshake to remote', remoteId)
          swarm.activeOutboundPeers[remoteId] = true
        }
      })
      pump(socket, peerStream, socket, function () {
        var remoteId = peerStream.remoteId
        if (!remoteId) return
        remoteId = remoteId.toString('hex')
        delete swarm.activeOutboundPeers[remoteId]
      })
    })

    cb(null, swarm)

    function close (cb) {
      server.close()
      inboundConnections.destroy()
      self.close(cb)
    }
  })

  server.once('error', function (err) {
    if (err.code === 'EADDRINUSE') server.listen(0) // asks OS for first open port
    else throw err
  })

  server.listen(DEFAULT_PORT)
}

Dat.prototype.close = function (cb) {
  this.drive.core.db.close()
  this.discovery.destroy(cb)
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

  var stats = {}

  self.joinTcpSwarm(link, function (err, swarm) {
    if (err) return cb(err)
    swarm.downloading = true
    stats.downloadRate = speedometer()
    stats.downloaded = 0
    stats.swarm = swarm
    var archive = self.drive.get(swarm.link, dir)

    archive.ready(function (err) {
      if (err) return cb(err)
      swarm.blocks = archive.entries
      var download = self.fs.createDownloadStream(archive, stats)
      pump(archive.createEntryStream(), download, function (err) {
        cb(err, swarm)
      })
    })

    var speed = speedometer()
    archive.on('file-download', function (entry, data, block) {
      stats.downloaded += data.length
      stats.downloadRate(data.length)
    })
  })

  return stats
}

function resolveHash (link) {
  // TODO: handle 'pretty' or 'named' links
  return new Buffer(link, 'hex')
}

function isLocalPeer (peer) {
  var localAddresses = {}
  var interfaces = os.networkInterfaces()
  Object.keys(interfaces).forEach(function (i) {
    var entries = interfaces[i]
    entries.forEach(function (e) {
      localAddresses[e.address] = true
    })
  })
  if (localAddresses.hasOwnProperty(peer.host)) return true
  return false
}
