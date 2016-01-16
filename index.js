var net = require('net')
var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var pump = require('pump')
var webrtcSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var series = require('run-series')
var debug = require('debug')('dat')
var discoveryChannel = require('discovery-channel')
var Connections = require('connections')

module.exports = Dat

function Dat (opts) {
  if (!(this instanceof Dat)) return new Dat(opts)
  if (!opts) opts = {}
  this.fs = opts.fs || require('./fs.js')
  this.level = opts.db || require('./db.js')(opts)
  var drive = hyperdrive(this.level)
  this.drive = drive
  this.peers = {}
  if (opts.discovery !== false) this.discovery = discoveryChannel({dns: {tracker: 'tracker.publicbits.org'}})
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
    if (err) {
      return done(err)
    }
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

  function done () {
    pack.finalize(function (err) {
      if (err) return cb(err)
      var link = pack.id.toString('hex')
      cb(null, link)
      // TODO pack cleanup
    })
  }

  function eachItem (item, next) {
    var entry = pack.entry(item, next)
    if (item.createReadStream) {
      pump(item.createReadStream(), entry)
    }
  }
}

Dat.prototype.joinWebrtcSwarm = function (link, opts) {
  if (!opts) opts = {}
  opts.signalhub = opts.signalhub || 'https://signalhub.mafintosh.com' // change to publicbits.org
  var self = this
  link = link.replace('dat://', '').replace('dat:', '')
  var key = link.toString('hex')
  var hub = signalhub('hyperdrive/' + key, [opts.signalhub])
  var swarm = webrtcSwarm(hub)

  swarm.on('peer', function (peer) {
    pump(peer, self.drive.createPeerStream(), peer, function () {
      console.log('got a peer!', peer)
    })
  })

  return swarm
}

Dat.prototype.joinTcpSwarm = function (link, cb) {
  var self = this
  link = link.replace('dat://', '').replace('dat:', '') // strip dat protocol

  var server = net.createServer(function (socket) {
    pump(socket, self.drive.createPeerStream(), socket)
  })

  var connections = Connections(server)

  server.on('listening', function () {
    var port = server.address().port
    var hash = resolveHash(link)

    self.discovery.add(hash, port)
    self.discovery.on('peer', function (hash, peer) {
      debug('found peer for ', link)
      var peerid = peer.host + ':' + peer.port
      if (self.peers[peerid]) return
      self.peers[peerid] = true
      var socket = net.connect(peer.port, peer.host)
      pump(socket, self.drive.createPeerStream(), socket, function () {
        delete self.peers[peerid]
      })
    })

    function close (cb) {
      server.close()
      connections.destroy()
      self.close(cb)
    }

    cb(null, link, port, close)
  })

  server.once('error', function () {
    server.listen(0)
  })

  server.listen(3282)
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

Dat.prototype.download = function (link, dir, cb) {
  var self = this
  if (!cb) cb = function noop () {}

  self.joinTcpSwarm(link, function (err, link, port, close) {
    if (err) throw err

    var feed = self.drive.get(link) // the link identifies/verifies the content
    var feedStream = feed.createStream()
    var download = self.fs.createDownloadStream(self.drive, dir)
    pump(feedStream, download, function (err) {
      cb(err, link, port, close)
    })
  })
}

function resolveHash (link) {
  // TODO: handle 'pretty' or 'named' links
  return new Buffer(link, 'hex')
}
