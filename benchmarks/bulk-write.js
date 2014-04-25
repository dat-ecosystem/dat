// usage: $ node benchmarks/bulk-write.js some.csv
// 
// examples from my machine:
//

var Dat = require('../')

var path = require('path')
var fs = require('fs')
var os = require('os')
var child = require('child_process')
var rmrf = require('rimraf')

function noop() {}

var dbpath = path.join(os.tmpdir(), 'datbulktest')
var sourceFile = process.argv[2]

cleanup(function() {
  fs.mkdirSync(dbpath)
  testBulk()
})

function testBulk() {
  var dat = new Dat(dbpath, function(err) {
    child.exec('wc -l ' + sourceFile, function(err, stdo, stde) {
      var size = stdo.toString()
      var lines = +size.trim().split(' ')[0]
      var msg = 'wrote ' + lines + ' rows'
      console.time(msg)
      console.log('writing csv...')
      var ws = dat.createWriteStream({ csv: true })
      fs.createReadStream(sourceFile).pipe(ws)
      ws.on('end', function() {
        console.timeEnd(msg)
        dat.close() // stops http server
        cleanup()
      })
    })
  })
}

function cleanup(cb) {
  rmrf(dbpath, function(err) {
    if (err) console.log('cleanup err', err)
    console.log('deleted', dbpath)
    if (cb) cb()
  })
}
