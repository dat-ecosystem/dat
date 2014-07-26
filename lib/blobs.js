var blobs = require('content-addressable-store')
var debug = require('debug')('dat.blobs')

module.exports = function(dir, hasher) {
  var store = blobs(dir, hasher || 'sha256')
  return new BlobWriter(store)
}

function BlobWriter(store) {
  this.store = store
}

BlobWriter.prototype.createWriteStream = function(options, cb) {
  var self = this
  
  if (typeof cb === 'undefined') {
    cb = options
    options = {}
  }
  
  var ws = this.store.addStream(options)
  var errored = false
  
  ws.on('error', function(e) {
    debug('writeStream error', e)
    errored = true
    cb(e)
  })
  
  ws.on('close', function() {
    var hash = ws.hash
    debug('writeStream close', hash)
    if (errored) return
    // does an fs.stat internally
    self.store.has(hash, function(err, stat) {
      if (err) return cb(err)
      cb(null, {hash: hash, size: stat.size})
    })
  })
  
  return ws
}

BlobWriter.prototype.createReadStream = function(hash) {
  return this.store.getStream(hash)
}

BlobWriter.prototype.exists = function(hash, cb) {
  this.store.has(hash, function(err, stat) {
    var exists
    if (err && err.code === 'ENOENT') exists = false
    else if (err) return cb(err)
    else exists = true
    cb(null, exists)
  })
}
