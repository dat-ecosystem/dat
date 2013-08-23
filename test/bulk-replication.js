// this benchmark creates 2 leveldbs
// the first one it fills with argv[2] num rows of data
// the second one get initialized from the first
// pass argv[3] a truthy value to use pure http + json replication
// argv[3] falsy (default) will use fast init (leveldb .tar.gz copy)
//
// results on a mb air 1.7ghz i5 4gb ram SSD:
// $ node test/bulk-replication.js 50000
// batch put 50000: 2040ms
// generate tar: 246ms
// replicate 50000: 558ms
//
// $ node test/bulk-replication.js 50000 true
// batch put 50000: 2051ms
// replicate 50000: 10677ms

var remote = "http://localhost:6461/_archive"
if (process.argv[3]) remote = false

var getDat = require('../')

var path = require('path')
var fs = require('fs')
var os = require('os')
var rmrf = require('rimraf')

function noop() {}

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
      console.time('batch put ' + size)
      var pending = 0
      for (var i = 0; i < size; i++) {
        pending++
        store.put('data-' + i, {'val': i}, function() {
          pending--
          if (pending === 0) serve()
        })
      }
      function serve() {
        console.timeEnd('batch put ' + size)
        source.serve({}, function(err, msg) {
          var dest = getDat(destPath)
          setTimeout(function giveLevelDBSomeTimeToCompact() {
            console.time('replicate ' + size)
            dest.init({remote: remote}, function(err) {
              dest.pull({}, function(err) {
                console.timeEnd('replicate ' + size)
                source._close()
                dest._close()
                cleanup()
              })
            })
          }, process.argv[4] || 0)
        })
      }
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
