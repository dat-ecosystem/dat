var os = require('os')
var path = require('path')
var rimraf = require('rimraf')
var concat = require('concat-stream')
var debug = require('debug')('dat.test-common')

var datPath = path.join(__dirname, '..')
var Dat = require(datPath)

var tmp = os.tmpdir()
var dat1tmp = path.join(tmp, 'dat1')
var dat2tmp = path.join(tmp, 'dat2')


module.exports = function() {
  var common = {}
  common.rpc = false
  common.testPrefix = ''
  common.tmp = tmp
  common.dat1tmp = dat1tmp
  common.dat2tmp = dat2tmp

  common.getDat = function getDat(t, opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }
  
    var dat2
    
    var leveldown = process.env['DAT_LEVELDOWN']
    var leveldownPath = process.env['DAT_LEVELDOWN_PATH']
    if (leveldown) {
      opts.leveldown = {
        module: leveldown,
        path: leveldownPath
      }
      debug('using DAT_TEST_LEVELDOWN', opts.leveldown)
    }
  
    var datPath = opts.datPath || dat1tmp
    var dat = new Dat(datPath, opts, function ready(err) {
      if (err) throw err
      dat.listen(function(err) {
        if (err) throw err
        if (common.rpc) {
          dat2 = new Dat(datPath, opts, function ready(err) {
            cb(dat2, done)
          })
        } else {
          cb(dat, done)
        }
      })
    })
  
    function done(cb) {
      setTimeout(destroy, 100) // fixes weird test errors on travis-ci
      
      function destroy() {
        dat.destroy(function(err) {
          if (err) throw err
          if (dat2) {
            dat2.destroy(function(err) {
              if (err) throw err
              cleanup()
            })
          } else cleanup()
      
          function cleanup() {
            common.destroyTmpDats(function() {
              if (opts.noTestEnd) {
                if (cb) return cb()
                return
              }
              t.end()
              if (cb) cb()
            })
          }
        })
      }
    }
  }

  common.compareData = function compareData(t, dat1, dat2, cb) {
    dat1.createReadStream().pipe(concat(function(db1) {
      dat2.createReadStream().pipe(concat(function(db2) {
        t.deepEquals(db1, db2, 'low level data matches')
        cb()
      }))
    }))
  }

  common.destroyTmpDats = function destroyTmpDats(cb) {
    rimraf(dat1tmp, function(err) {
      rimraf(dat2tmp, function(err) {
        cb()
      })
    })
  }
  
  return common
}

