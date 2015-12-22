var net = require('net')
var fs = require('fs')
var path = require('path')
var hyperdrive = require('hyperdrive')
var mkdirp = require('mkdirp')
var through = require('through2')
var pump = require('pump')
var discoveryChannel = require('discovery-channel')
var Connections = require('connections')
var datDb = require('./db.js')
var datFs = require('./fs.js')

module.exports = Dat

function Dat (dir, opts) {
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  if (!opts) opts = {}
  this.dir = dir
  this.fs = opts.fs || datFs
  var datPath = path.join(this.dir, '.dat', 'db')
  this.level = opts.db || datDb(datPath, opts)
  var drive = hyperdrive(this.level)
  this.drive = drive
  this.peers = {}
  this.discovery = discoveryChannel()
}

Dat.prototype.addDirectory = function (cb) {
  var pack = this.drive.add()

  datFs.listEach({dir: this.dir}, eachItem, eachDone)

  function eachItem (item, next) {
    var entry = pack.entry(item, next)
    if (item.createReadStream) {
      pump(item.createReadStream(), entry)
    }
  }

  function eachDone (err) {
    if (err) {
      return cb(err)
      // TODO pack cleanup
    }
    pack.finalize(function (err) {
      if (err) return cb(err)
      var link = pack.id.toString('hex')
      cb(null, link)
    })
  }
}

Dat.prototype.joinTcpSwarm = function (link, cb) {
  var self = this

  var server = net.createServer(function (socket) {
    pump(socket, self.drive.createPeerStream(), socket)
  })

  var connections = Connections(server)

  server.listen(0, function (err) {
    if (err) return cb(err)
    var port = server.address().port

    function update () {
      // discovery-channel currently only works with 20 bytes hashes
      var hash = resolveHash(link)
      self.discovery.announce(hash, port)

      var lookup = self.discovery.lookup(hash)

      lookup.on('peer', function (ip, port) {
        var peerid = ip + ':' + port
        if (self.peers[peerid]) return
        self.peers[peerid] = true
        var socket = net.connect(port, ip)
        pump(socket, self.drive.createPeerStream(), socket, function () {
          delete self.peers[peerid]
        })
      })
    }

    update()
    var interval = setInterval(update, 1000 * 60)

    function close (cb) {
      clearInterval(interval)
      server.close()
      connections.destroy()
      self.drive.db.close()
      self.discovery.close(cb)
    }

    cb(null, link, port, close)
  })
}

// TODO remove fs specific code from this method
Dat.prototype.download = function (link, cb) {
  var self = this
  if (!cb) cb = function noop () {}

  self.joinTcpSwarm(link, function (err, link, port, close) {
    if (err) throw err

    var feed = self.drive.get(link) // the link identifies/verifies the content
    var feedStream = feed.createStream()

    var download = through.obj(function (entry, enc, next) {
      var entryPath = path.join(self.dir, entry.value.name)
      mkdirp.sync(path.dirname(entryPath))
      var content = self.drive.get(entry)
      var writeStream = fs.createWriteStream(entryPath, {mode: entry.value.mode})
      pump(content.createStream(), writeStream, function (err) {
        next(err)
      })
    })

    pump(feedStream, download, function (err) {
      cb(err, link, port, close)
    })
  })
}

function resolveHash (link) {
  // TODO: handle 'pretty' or 'named' links
  return new Buffer(link, 'hex').slice(0, 20)
}
