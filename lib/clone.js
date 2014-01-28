var fbackup = require('folder-backup')
var request = require('request')

module.exports = function(dat, remote, cb) {
  copyMeta(dat, remote, function(err) {
    if (dat.meta.json.backend === 'leveldown-hyper') hyperClone(dat, remote, cb)
    else normalClone(dat, remote, cb)
  })
}

function normalClone(dat, remote, cb) {
  dat._storage({ path: dat.paths().level }, function(err, seq) {
    if (err) return cb(err)
    dat.pull(remote + '/_changes', cb)
  })
}

function hyperClone(dat, remote, cb) {
  var opts = {
    showProgress: true,
    path: dat.paths().level
  }
  fbackup.clone(remote + '/_archive', opts, cb)
}

function copyMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/_package'}, function(err, resp, json) {
    if (err) return cb(err)
    dat.meta.write(json, function(err) {
      if (err) return cb(err)
      dat.meta.json = json
      cb()
    })
  })
}
