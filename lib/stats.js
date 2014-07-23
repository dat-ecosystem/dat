var stream = require('stream')
var util = require('util')
var events = require('level-events')
var through = require('through2')
var pumpify = require('pumpify')

var StatsStream = function() {
  stream.Readable.call(this, {objectMode:true})

  this.destroyed = false
  this.level = {
    read: 0,
    written: 0,
    get: 0,
    put: 0,
    del: 0
  }
  this.http = {
    read: 0,
    written: 0
  }
  this.blobs = {
    read: 0,
    written: 0
  }
}

util.inherits(StatsStream, stream.Readable)

StatsStream.prototype.update = function(stats) {
  if (this.destroyed) return

  this.push({
    level: {
      read: stats.level.read,
      written: stats.level.written,
      get: stats.level.get,
      put: stats.level.put,
      del: stats.level.del
    },
    http: {
      read: stats.http.read,
      written: stats.http.written
    },
    blobs: {
      read: stats.blobs.read,
      written: stats.blobs.written
    }
  })
}

StatsStream.prototype.destroy = function() {
  if (this.destroyed) return
  this.destroyed = true
  this.push(null)
  this.emit('close')
}

StatsStream.prototype._read = function() {
  // do nothing
}

module.exports = function() {
  var that = {}
  var running = []
  var stats = {
    level: {read:0, written:0, get:0, put:0, del:0},
    http: {read:0, written:0},
    blobs: {read:0, written:0}
  }

  var resume = function(rs) {
    rs.resume()
    return rs
  }

  var flush = function() {
    for (var i = 0; i < running.length; i++) running[i].update(stats)

    stats.level.get = 0
    stats.level.put = 0
    stats.level.del = 0
    stats.level.read = 0
    stats.level.written = 0
    stats.http.read = 0
    stats.http.written = 0
    stats.blobs.read = 0
    stats.blobs.written = 0
  }

  var interval

  that.destroy = function() {
    clearInterval(interval)
    for (var i = 0; i < running.length; i++) {
      running[i].destroy()
    }
  }

  that.blobs = function(blobs) {
    var wrap = {}

    var write = function(data, enc, cb) {
      stats.blobs.written += data.length
      cb(null, data)
    }

    var read = function(data, enc, cb) {
      stats.blobs.read += data.length
      cb(null, data)
    }

    wrap.backend = blobs

    wrap.createReadStream = function() {
      return pumpify(blobs.createReadStream.apply(blobs, arguments), through(read))
    }

    wrap.createWriteStream = function() {
      return resume(pumpify(through(write), blobs.createWriteStream.apply(blobs, arguments)))
    }

    return wrap
  }

  that.level = function(db) {
    events(db)
      .on('read', function(key, value) {
        stats.level.get++
        stats.level.read += value.length
      })
      .on('write', function(key, value) {
        stats.level.put++
        stats.level.written += value.length
      })
      .on('delete', function(key) {
        stats.level.del++
      })
  }

  that.http = function(server) {
    server.on('connection', function(socket) {
      var read = 0
      var written = 0

      var track = function() {
        stats.http.read += socket.bytesRead - read
        stats.http.written += socket.bytesWritten - written
        read = socket.bytesRead
        written = socket.bytesWritten
      }

      var interval = setInterval(track)

      socket.on('close', function() {
        clearInterval(interval)
        track()
      })
    })
  }

  that.createStream = function() {
    if (!interval) interval = setInterval(flush, 1000)
    var stream = new StatsStream()
    running.push(stream)
    stream.on('close', function() {
      var i = running.indexOf(stream)
      if (i > -1) running.splice(stream, 1)
      if (running.length) return
      clearInterval(interval)
      interval = null
    })
    return stream
  }

  return that
}