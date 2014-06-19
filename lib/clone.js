var request = require('request')
var url = require('url')
var debug = require('debug')('dat.clone')

module.exports = function(dat, options, cb) {
  fetchMeta(dat, options.remote, function(err, remoteMeta) {
    if (err) return cb(err, err.message)
    
    dat.meta.write(remoteMeta, function(err) {
      if (err) return cb(err, err.message)
      dat.meta.json = remoteMeta
      
      normalClone(dat, options, cb)
    })
  })
}

function normalClone(dat, options, cb) {
  dat._storage({ path: dat.paths().level }, function(err) {
    if (err) return cb(err, err.message)
    dat.pull(options, cb)
  })
}

function fetchMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/api/package'}, function(err, resp, json) {
    if (err) return cb(err)
    cb(null, json)
  })
}
