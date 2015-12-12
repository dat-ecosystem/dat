var net = require('net')
var fs = require('fs')
var path = require('path')
var walker = require('folder-walker')
var level = require('level')
var hyperdrive = require('hyperdrive')
var xtend = require('xtend')
var mkdirp = require('mkdirp')
var through = require('through2')
var pump = require('pump')
var discoveryChannel = require('discovery-channel')

module.exports = Dat

function Dat (dir, opts) {
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  if (!opts) opts = {}
  this.dir = dir
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  var datPath = path.join(this.dir, '.dat', 'db')
  if (opts.createIfMissing) mkdirp.sync(datPath)
  var hyperdriveOpts = {name: 'dat'}
  var drive = hyperdrive(level(datPath, opts), hyperdriveOpts)
  this.drive = drive
  this.peers = {}
  this.discovery = discoveryChannel()
}

Dat.prototype.share = function (cb) {
  var self = this
  var stream = walker(this.dir, {filter: function (filename) {
    var basename = path.basename(filename)
    if (basename[0] === '.') return false // ignore hidden files and folders
    return true
  }})
  var pack = this.drive.add()
  var adder = through.obj(function (data, enc, next) {
    var isFile = data.stat.isFile()
    if (!isFile) {
      console.log('skipping non file', data.filepath)
      return next()
    }
    console.log('reading', data.filepath)
    var entry = pack.entry({name: data.relname, mode: data.stat.mode})
    fs.createReadStream(data.filepath).pipe(entry)
    next()
  })
  pump(stream, adder, function (err) {
    if (err) throw err
    pack.finalize(function () {
      var link = pack.id.toString('hex')
      self.serve(link, function (err, link, port, close) {
        if (err) throw err
        cb(null, link, port, close)
        console.log('Sharing on', port)
      })
    })
  })
}

Dat.prototype.serve = function (link, cb) {
  var self = this

  var server = net.createServer(function (socket) {
    pump(socket, self.drive.createPeerStream(), socket, function (err) {
      if (err) console.log('peer err', err)
    })
  })

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
        console.log('found new peer', peerid)
        self.peers[peerid] = true
        var socket = net.connect(port, ip)
        pump(socket, self.drive.createPeerStream(), socket, function (err) {
          if (err) console.log('peer err', err)
          delete self.peers[peerid]
        })
      })
    }

    update()
    var interval = setInterval(update, 1000 * 60)

    function close (cb) {
      clearInterval(interval)
      server.close(cb)
    }

    cb(null, link, port, close)
  })
}

Dat.prototype.download = function (link, cb) {
  var self = this
  if (!cb) cb = function noop () {}

  self.serve(link, function (err, port, close) {
    if (err) throw err
    console.log('Sharing on', port)
  })

  var feed = self.drive.get(link) // the link identifies/verifies the content
  var feedStream = feed.createStream()

  feedStream.on('data', function (entry) {
    console.log('downloading', entry.value.name)
    var content = self.drive.get(entry)
    var writeStream = fs.createWriteStream(entry.value.name, {mode: entry.value.mode})
    content.createStream().pipe(writeStream)
  })
}

function resolveHash (link) {
  // TODO: handle 'pretty' or 'named' links
  return new Buffer(link, 'hex').slice(0, 20)
}
