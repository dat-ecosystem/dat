var getDat = require('../')

var path = require('path')
var fs = require('fs')
var os = require('os')
var rmrf = require('rimraf')

function noop() { }

var sourcePath = path.join(os.tmpdir(), 'datsource')
var destPath = path.join(os.tmpdir(), 'datdest')

cleanup(function() {
  fs.mkdirSync(sourcePath)
  fs.mkdirSync(destPath)
  testReplication(process.argv[2])
})

function testReplication(size) {
  size = size || 1000
  var source = getDat(sourcePath)
  source.init({}, function(err, msg) {
    var store = source._storage({}, function(err, seq) {
      console.time('replicate ' + size)
      for (var i = 0; i < size; i++)
        store.put('data-' + i, {'val': i}, noop)
      source.serve({}, function(err, msg) {
        var dest = getDat(destPath)
        dest.init({}, function(err) {
          dest.pull({}, function(err) {
            console.timeEnd('replicate ' + size)
            source._close()
            dest._close()
            cleanup()
          })
        })
      })
    })
  })
}

function cleanup(cb) {
  rmrf(sourcePath, function(err) {
    if (err) console.log('cleanup err', err)
    rmrf(destPath, function(err) {
      if (err) console.log('cleanup err', err)
      if (cb) cb()
    })
  })
}
