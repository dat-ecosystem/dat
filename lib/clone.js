var clearLog = require('single-line-log')
var request = require('request')
var url = require('url')
var prettyBytes = require('pretty-bytes')
var debug = require('debug')('dat.clone')

module.exports = function(dat, remote, cb) {
  fetchMeta(dat, remote, function(err, remoteMeta) {
    if (err) return cb(err, err.message)
    
    dat.meta.write(remoteMeta, function(err) {
      if (err) return cb(err, err.message)
      dat.meta.json = remoteMeta
      
      normalClone(dat, remote, cb)
    })
  })
}

function normalClone(dat, remote, cb) {
  dat._storage({ path: dat.paths().level }, function(err) {
    if (err) return cb(err, err.message)
    dat.pull(remote, cb)
  })
}

function fetchMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/api/package'}, function(err, resp, json) {
    if (err) return cb(err)
    cb(null, json)
  })
}
