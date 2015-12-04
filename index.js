var net = require('net')
var fs = require('fs')
var path = require('path')
var walker = require('folder-walker')
var level = require('level')
var homedir = require('os-homedir')
var hyperdrive = require('hyperdrive')
var xtend = require('xtend')
var mkdirp = require('mkdirp')
var through = require('through2')
var pump = require('pump')
var discoveryChannel = require('discovery-channel')
var series = require('run-series')

module.exports = Dat

function Dat (dir, opts) {
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  if (!opts) opts = {}
  this.dir = dir
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  var datPath = opts.datPath || path.join(homedir(), '.dat/db')
  if (opts.createIfMissing) mkdirp.sync(datPath)
  var hyperdriveOpts = {name: 'dat'}
  var drive = hyperdrive(level(datPath, opts), hyperdriveOpts)
  this.drive = drive
  this.discovery = discoveryChannel({dht: false})
}

Dat.prototype.share = function () {
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
      console.log(link, '<-- this is your hyperdrive link')
      self.serve(link, function (err, port, close) {
        if (err) throw err
        console.log('Sharing on', port)
      })
    })
  })
}

Dat.prototype.serve = function (link, cb) {
  var self = this
  var server = net.createServer(function (socket) {
    socket.pipe(self.drive.createPeerStream()).pipe(socket)
  })

  server.listen(0, function (err) {
    if (err) return cb(err)
    var port = server.address().port

    function ann () {
      // discovery-channel currently only works with 20 bytes hashes
      self.discovery.announce(link.slice(0, 20), port)
    }

    ann()
    var interval = setInterval(ann, 10000)

    function close (cb) {
      clearInterval(interval)
      server.close(cb)
    }

    cb(null, port, close)
  })
}

Dat.prototype.download = function (link) {
  var self = this
  var lookup = self.discovery.lookup(link.slice(0, 20))

  lookup.on('peer', function (ip, port) {
    console.log('found peer')
    var socket = net.connect(port, ip)
    socket.pipe(self.drive.createPeerStream()).pipe(socket)
  })
  var feed = self.drive.get(link) // the link identifies/verifies the content
  var next = 0
  downloadNext()

  function downloadNext () {
    feed.get(next, function (err, entry) {
      if (err) throw err
      console.log('entry', entry)
      var content = self.drive.get(entry.link)
      var gets = []
      var writeStream = fs.createWriteStream(entry.value.name, {mode: entry.value.mode})
      for (var i = 0; i < entry.link.blocks; i++) {
        var download = (function (piece) {
          return function (cb) {
            content.get(piece, function (err, data) {
              writeStream.write(data)
              cb(err)
            })
          }
        })(i)
        gets.push(download)
      }
      series(gets, function (err) {
        if (err) throw err
        writeStream.end()
        next++
        downloadNext()
      })
    })
  }
}
