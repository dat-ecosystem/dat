var fbackup = require('folder-backup')
var clearLog = require('single-line-log')
var request = require('request')
var url = require('url')

module.exports = function(dat, remote, cb) {
  fetchMeta(dat, remote, function(err, remoteMeta) {
    if (err) return cb(err, err.message)

    var isHyper = remoteMeta.liveBackup
    
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
  
  var total, lastMeta = {read: 0}
  var count = 0
  
  backup.on('progress', function(meta) {
    lastMeta = meta
    update()
  })
  
  backup.on('file-count', function(count) {
    total = count
  })
  
  backup.on('entry', function(entry) {
    if (entry.type !== 'file') return
    count++
    update()
  })
  
  function update() {
    var read = lastMeta.read
    clearLog('Cloning remote database. Transferred ' + ~~(read / 1024) + 'KB. Fetched ' + count + ' of ' + total + ' pieces.\n')
  }
}

function fetchMeta(dat, remote, cb) {
  request({json: true, uri: remote + '/_package'}, function(err, resp, json) {
    if (err) return cb(err)
    cb(null, json)
  })
}
