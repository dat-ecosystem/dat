var blobs = require('content-addressable-store')
var debug = require('debug')('dat.blobs')

module.exports = function(dir, hasher) {
  var store = blobs(dir, hasher || 'sha1')
  return new BlobWriter(store)
}

function BlobWriter(store) {
  this.store = store
}

BlobWriter.prototype.createWriteStream = function(options, cb) {
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
    cb(null, hash)
  })
  
  return ws
}

BlobWriter.prototype.createReadStream = function(hash) {
  return this.store.getStream(hash)
}
