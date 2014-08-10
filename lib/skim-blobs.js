var request = require('request')
var duplexify = require('duplexify')
var debug = require('debug')('skim-blobs')

module.exports = function(backend, remote) {
  var wrap = {}

  // turtles
  wrap.backend = backend.backend

  wrap.createReadStream = function(obj) {
    var dup = duplexify()
    dup.setWritable(false)
    
    backend.exists(obj, function(err, exists) {
      if (err) return dup.destroy(err)
      var stream
      var remoteUrl = remote + '/api/blobs/' + obj.hash
      
      if (exists) debug('createReadStream from local')
      else debug('createReadStream copying from', remoteUrl)
      
      if (exists) {
        return dup.setReadable(backend.createReadStream(obj))
      }
      
      // copy remote blob into the local backend
      request(remoteUrl).pipe(backend.createWriteStream(function(err, meta) {
        if (err) return dup.destroy(err)
        if (meta.hash !== obj.hash) return dup.destroy(new Error('Blob hashes do not match: ' + JSON.stringify([meta.hash, obj.hash])))
        dup.setReadable(backend.createReadStream(obj))
      }))
      
    })
    
    return dup
  }

  wrap.createWriteStream = function() {
    return backend.createWriteStream.apply(backend, arguments)
  }
  
  wrap.exists = function(obj, cb) {
    backend.exists(obj, function(err, exists) {
      if (err) return cb(err)
      if (exists) return cb(null, exists)
      request({method: "HEAD", url: remote + '/api/blobs'}, function(err, resp) {
        if (err) return cb(err)
        cb(null, resp.statusCode === 200 ? true : false)
      })
    })
  }

  return wrap
}
