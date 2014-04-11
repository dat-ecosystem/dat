var fbackup = require('folder-backup')
var request = require('request')

module.exports = function(dat, remote, cb) {
  fetchMeta(dat, remote, function(err, remoteMeta) {
    if (err) return cb(err, err.message)
    var isHyper = remoteMeta.backend === 'leveldown-hyper'
    
    // make sure that when you clone the dat.json you default to 'leveldown' and not a custom backend
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
  dat._storage({ path: dat.paths().level }, function(err, seq) {
    if (err) return cb(err, err.message)
    dat.pull(remote, cb)
  })
}

function hyperClone(dat, remote, cb) {
  var opts = {
    showProgress: true,
    path: dat.paths().level
  }
  fbackup.clone(remote + '/_archive', opts, cb)
}

function fetchMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/_package'}, function(err, resp, json) {
    if (err) return cb(err)
    cb(null, json)
  })
}
