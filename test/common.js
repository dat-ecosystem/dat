var os = require('os')
var path = require('path')
var rimraf = require('rimraf')
var concat = require('concat-stream')

var datPath = path.join(__dirname, '..')
var Dat = require(datPath)

var tmp = os.tmpdir()
var dat1tmp = path.join(tmp, 'dat1')
var dat2tmp = path.join(tmp, 'dat2')

module.exports.tmp = tmp
module.exports.dat1tmp = dat1tmp
module.exports.dat2tmp = dat2tmp

module.exports.getDat = function getDat(t, cb) {
  var dat = new Dat(dat1tmp, function ready(err) {
    if (err) throw err
    dat.init(function(err, msg) {
      if (err) throw err
      cb(dat, done)
    })  
  })
  
  function done() {
    dat.destroy(function(err) {
      if (err) throw err
      module.exports.destroyTmpDats(function() {
        t.end()
      })
    })
  }
}

module.exports.serveAndPull = function serveAndPull(dat1, dat2, cb) {
  dat1.serve(function(err, msg) {
    if (err) throw err
    dat2.init(function(err, msg) {
      // ignore errors here
      dat2.pull(function(err) {
        if (err) throw err
        cb()
      })
    })
  })
}

module.exports.compareData = function compareData(t, dat1, dat2, cb) {
  dat1.createReadStream().pipe(concat(function(db1) {
    dat2.createReadStream().pipe(concat(function(db2) {
      t.deepEquals(db1, db2, 'low level data matches')
      cb()
    }))
  }))
}

module.exports.destroyTmpDats = function destroyTmpDats(cb) {
  rimraf(dat1tmp, function(err) {
    rimraf(dat2tmp, function(err) {
      cb()
    })
  })
}
