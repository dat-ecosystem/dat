var fbackup = require('folder-backup')
var clearLog = require('single-line-log')
var request = require('request')
var url = require('url')
var prettyBytes = require('pretty-bytes')
var debug = require('debug')('dat.clone')

module.exports = function(dat, remote, cb) {
  fetchMeta(dat, remote, function(err, remoteMeta) {
    if (err) return cb(err, err.message)

    var isHyper = remoteMeta.liveBackup
    
    // make sure that when you clone the dat.json you default to 'leveldown-prebuilt' and not a custom backend
    delete remoteMeta.backend
    
    dat.meta.write(remoteMeta, function(err) {
      if (err) return cb(err, err.message)
      dat.meta.json = remoteMeta
      
      if (isHyper) hyperClone(dat, remote, cb)
      else normalClone(dat, remote, cb)
    })
  })
}

function normalClone(dat, remote, cb) {
  dat._storage({ path: dat.paths().level }, function(err) {
    if (err) return cb(err, err.message)
    dat.pull(remote, cb)
  })
}

function hyperClone(dat, remote, cb) {
  var opts = {
    path: dat.paths().level
  }
  
  var backup = fbackup.clone(remote + '/_archive', opts, function(err) {
    if (err) return cb(err)
    clearLog('Cloned remote database snapshot.\n')
    cb()
  })
  
  backup.on('progress', function(meta) {
    clearLog('Cloning remote database. Transferred ' + prettyBytes(meta.transferred) + '.\n')
  })
}

function fetchMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/_package'}, function(err, resp, json) {
    if (err) return cb(err)
    cb(null, json)
  })
}
