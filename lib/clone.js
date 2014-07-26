var request = require('request')
var url = require('url')
var xtend = require('xtend')
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
  dat._storage(xtend(options, { path: dat.paths().level }), function(err) {
    if (err) return cb(err, err.message)
    dat.pull(options, cb)
  })
}

function fetchMeta(dat, remote, cb) {
  var uri = remote + '/api/metadata'
  request({json: true, uri: uri}, function(err, resp, json) {
    if (err) {
      debug('meta fetch error', uri, err)
      return cb(err)
    }
    cb(null, json)
  })
}
