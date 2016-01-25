var os = require('os')
var net = require('net')
var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var pump = require('pump')
var webrtcSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var series = require('run-series')
var discoveryChannel = require('discovery-channel')
var connections = require('connections')
var through = require('through2')
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
  this.activePeers = {}
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
  var pack = this.drive.add()
  this.scan(dirs, eachItem, done)

  var stats = {
    files: 0
  }

  return stats

  function eachItem (item, next) {
    var entry = pack.entry(item, function (err) {
      if (item.type === 'file') stats.files++
      if (err) return next(err)
      next()
    })
    if (item.createReadStream) {
      pump(item.createReadStream(), entry)
    }
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
  var transferred = {
    up: 0,
    down: 0
  }

  var server = net.createServer(function (socket) {
    var uploadCount = through(function (ch, enc, next) {
      transferred.up += ch.length
      this.push(ch)
      next()
    })
    var downloadCount = through(function (ch, enc, next) {
      transferred.down += ch.length
      this.push(ch)
      next()
    })
    pump(socket, downloadCount, self.drive.createPeerStream(), uploadCount, socket)
  })

  var swarmConnections = connections(server)

  server.on('listening', function () {
    var swarm = {
      port: server.address().port,
      hash: resolveHash(link),
      link: link,
      close: close,
      server: server,
      connections: swarmConnections,
      dat: self,
      transferred: transferred,
      uploadSpeed: uploadSpeed,
      downloadSpeed: downloadSpeed,
      total: null,
      peerCount: 0,
      started: new Date(),
      blocks: null
    }

    self.discovery.add(swarm.hash, swarm.port)

    self.discovery.on('peer', function (hash, peer) {
      debug('peer discovery', link, peer)
      var peerid = peer.host + ':' + peer.port
      if (isLocalPeer(peer) && peer.port === swarm.port) return // ignore self
      if (self.blacklist.hasOwnProperty(peerid)) return // ignore blacklist
      if (self.activePeers[peerid]) return // ignore already connected
      swarm.peerCount++
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
          self.activePeers[peerid] = true
        }
      })
      var uploadCount = through(function (ch, enc, next) {
        transferred.up += ch.length
        this.push(ch)
        next()
      })
      var downloadCount = through(function (ch, enc, next) {
        transferred.down += ch.length
        this.push(ch)
        next()
      })
      pump(socket, uploadCount, peerStream, downloadCount, socket, function () {
        delete self.activePeers[peerid]
      })
    })

    cb(null, swarm)

    function close (cb) {
      server.close()
      swarmConnections.destroy()
      self.close(cb)
    }

    function downloadSpeed () {
      var elapsed = +new Date() - +swarm.started
      return (transferred.down / elapsed)
    }

    function uploadSpeed () {
      var elapsed = +new Date() - +swarm.started
      return (transferred.up / elapsed)
    }
  })

  server.once('error', function (err) {
    if (err.code === 'EADDRINUSE') server.listen(0) // asks OS for first open port
    else throw err
  })

  server.listen(DEFAULT_PORT)
}

Dat.prototype.close = function (cb) {
  this.drive.db.close()
  this.discovery.destroy(cb)
}

Dat.prototype.metadata = function (link, cb) {
  var self = this
  var feed = self.drive.get(link)
  collect(feed.createStream(), cb)
}

// returns object that is used to render progress bars
Dat.prototype.download = function (link, dir, cb) {
  var self = this
  if (!cb) cb = function noop () {}

  var stats = {}

  self.joinTcpSwarm(link, function (err, swarm) {
    if (err) return cb(err)
    stats.swarm = swarm
    var feed = self.drive.get(swarm.link)

    // hack for now to populate feed.blocks quickly (for progress bars)
    feed.get(0, function (err) {
      if (err) return cb(err)
      var feedStream = feed.createStream()
      swarm.blocks = feed.blocks
      var download = self.fs.createDownloadStream(self.drive, dir, stats)
      pump(feedStream, download, function (err) {
        cb(err, swarm)
      })
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
