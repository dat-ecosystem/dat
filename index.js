var net = require('net')
var collect = require('collect-stream')
var hyperdrive = require('hyperdrive')
var pump = require('pump')
var series = require('run-series')
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
  this.discovery = discoveryChannel()
}

Dat.prototype.add = function (dirs, cb) {
  var self = this
  if (!dirs) throw new Error('must specify directory or directories to add')
  if (!cb) throw new Error('must specify callback')

  var pack = this.drive.add()

  // make sure its an array of dirs to simplify following code
  if (!Array.isArray(dirs)) dirs = [dirs]

  var tasks = dirs.map(function (dir) {
    return function (cb) {
      self.fs.listEach({dir: dir}, eachItem, cb)
    }
  })

  series(tasks, function (err) {
    if (err) {
      return cb(err)
      // TODO pack cleanup
    }
    pack.finalize(function (err) {
      if (err) return cb(err)
      var link = pack.id.toString('hex')
      cb(null, link)
    })
  })

  function eachItem (item, next) {
    var entry = pack.entry(item, next)
    if (item.createReadStream) {
      pump(item.createReadStream(), entry)
    }
  }
}

Dat.prototype.joinTcpSwarm = function (link, cb) {
  var self = this
  link = link.replace('dat://', '').replace('dat:', '') // strip dat protocol

  var server = net.createServer(function (socket) {
    pump(socket, self.drive.createPeerStream(), socket)
  })

  var connections = Connections(server)

  server.listen(0, function () {
    var port = server.address().port
    var hash = resolveHash(link)

    self.discovery.add(hash, port)
    self.discovery.on('peer', function (hash, peer) {
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
}

Dat.prototype.close = function (cb) {
  this.drive.db.close()
  this.discovery.close(cb)
}

Dat.prototype.metadata = function (link, cb) {
  var self = this
  self.joinTcpSwarm(link, function (_err, link, port, close) {
    var feed = self.drive.get(link)
    collect(feed.createStream(), function (err, data) {
      cb(err, data)
      // TODO: instead of closing, return the swarm.
      close()
    })
  })
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
