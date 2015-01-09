var fs = require('fs')
var request = require('request').defaults({json: true})
var path = require('path')
var concat = require('concat-stream')
var Dat = require('../../')

module.exports.paths = function(test, common) {
  test('.paths', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      var paths = dat.paths()
      t.equal(paths.dat, path.join(common.dat1tmp, '.dat'), 'dat path')
      t.equal(paths.level, path.join(common.dat1tmp, '.dat', 'store.dat'), 'level path')
      dat.destroy(function(err) {
        t.false(err, 'destroy ok')
        t.end()
      })
    })
  })
}

module.exports.initExistsDestroy = function(test, common) {
  test('.init, .exists, .destroy', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      dat.exists(function(exists) {
        t.true(exists, 'exists')
        destroy(function() {
          t.end()
        })
      })
    })
  
  
    function destroy(cb) {
      dat.destroy(function(err) {
        t.false(err, 'no err')
        dat.exists(function(exists) {
          t.false(exists, 'does not exist')
          cb()
        })
      })
    }
  })
}

module.exports.existingRepo = function(test, common) {
  test('.init in existing repo should return error', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      dat.init(function(err) {
        t.true(err, err)
        dat.destroy(function(err) {
          t.false(err, 'no err')
          t.end()
        })
      })
    })
  })  
}


module.exports.existingRepoClone = function(test, common) {
  test('.clone in existing repo should return error', function(t) {
    var dat = new Dat(common.dat1tmp, function ready() {
      dat.clone('http://localhost', {quiet:true}, function(err) {
        t.true(err, err)
        dat.destroy(function(err) {
          t.false(err, 'no err')
          t.end()
        })
      })
    })
  })
}

module.exports.autoPort = function(test, common) {
  test('dat gets an open port by default', function(t) {
    
    common.getDat(t, { datPath: common.dat1tmp, noTestEnd: true }, function(dat1, cleanup1) {
      common.getDat(t, { datPath: common.dat2tmp, noTestEnd: true }, function(dat2, cleanup2) {
        var portPaths = [dat1.paths().port, dat2.paths().port]
        var pending = 2
        verifyPort(dat1, done)
        verifyPort(dat2, done)
        
        function done() {
          if (--pending === 0) {
            pending = 2
            cleanup1(cleanup)
            cleanup2(cleanup)
            
            function cleanup() {
              if (--pending === 0) {
                t.false(fs.existsSync(portPaths[0]), 'dat1 deleted its PORT file on close')
                t.false(fs.existsSync(portPaths[1]), 'dat2 deleted its PORT file on close')
                t.end()
              }
            }
          }
        }
      })
    })
    
    function verifyPort(dat, cb) {
      var port = fs.readFileSync(dat.paths().port).toString()
      t.true(port, port)
      request('http://localhost:' + port + '/api', function(err, resp, json) {
        t.false(err, 'no GET err')
        t.equal(json.dat, 'Hello', JSON.stringify(json))
        dat.close(function(err) {
          t.false(err, 'no err')
          setImmediate(cb)
        })
      })
    }
  })
}

module.exports.sameDir = function(test, common) {
  test('multiple dat instances in the same directory', function(t) {
    common.getDat(t, { datPath: common.dat1tmp, noTestEnd: true }, function(dat1, cleanup1) {
      common.getDat(t, { datPath: common.dat1tmp, noTestEnd: true }, function(dat2, cleanup2) {
        dat2.put("foo", {"hello": "world"}, function(err) {
          if (err) throw err
          dat1.get('foo', function(err, row) {
            t.false(err, 'no err')
            t.equal(row.hello, "world", 'data matches')
            
            var ws = dat2.createWriteStream({ json: true, quiet: true })
            ws.on('end', function() {
              var cat = dat1.createValueStream()
              cat.pipe(concat(function(data) {
                t.equal(data.length, 2)
                t.equal(data[0].hello, "bruce wayne")
                t.equal(data[1].hello, "world")
                done()
              }))
            })
            ws.write(JSON.stringify({"hello": "bruce wayne"}))
            ws.end()
          })
        })
        
        function done() {
          cleanup2(function() {
            cleanup1(function() {
              t.true(true, 'cleaned up both dats')
              t.end()
            })
          })
        }
      })
    })
  })
}

module.exports.customDb = function(test, common) {
  test('instantiate + pass in custom levelup instance', function(t) {
    var memdb = require('memdb')()
    var dat = new Dat(common.dat1tmp, { db: memdb }, function ready() {
      dat.put({'foo': 'bar'}, function(err) {
        t.notOk(err, 'no put err')
        var onDiskDat = fs.existsSync(path.join(common.dat1tmp, '.dat', 'store.dat'))
        t.notOk(onDiskDat, 'no dat folder was created')
        memdb.createReadStream().pipe(concat(function(rows) {
          t.ok(rows.length > 0, 'got rows from memdb')
          dat.destroy(function(err) {
            t.false(err, 'destroy ok')
            t.end()
          })
        }))
      })
    })
  })
}

module.exports.customBackend = function(test, common) {
  test('instantiate + pass in custom leveldown instance', function(t) {
    var memdown = require('memdown')
    var dat = new Dat(common.dat1tmp, { leveldown: memdown }, function ready() {
      dat.put({'foo': 'bar'}, function(err) {
        t.notOk(err, 'no put err')
        var onDiskDat = fs.existsSync(path.join(common.dat1tmp, '.dat', 'store.dat'))
        t.notOk(onDiskDat, 'no dat folder was created')
        dat.destroy(function(err) {
          t.false(err, 'destroy ok')
          t.end()
        })
        
      })
    })
  })
}

module.exports.customBlobBackend = function(test, common) {
  test('instantiate + pass in custom blob backend', function(t) {
    var fakeBlobBackend = function() { return { pizza: true } }
    var dat = new Dat(common.dat1tmp, { blobs: fakeBlobBackend }, function ready() {
      t.ok(dat.blobs.backend.pizza, 'dat.blobs is our custom backend')
      dat.destroy(function(err) {
        t.false(err, 'destroy ok')
        t.end()
      })
    })
  })
}

module.exports.close = function(test, common) {
  test('.close closes db and server', function(t) {
    t.ok(false, 'IMPLEMENT ME')
    t.end()
  })
}

module.exports.all = function (test, common) {
  module.exports.paths(test, common)
  module.exports.initExistsDestroy(test, common)
  module.exports.existingRepo(test, common)
  module.exports.existingRepoClone(test, common)
  module.exports.autoPort(test, common)
  module.exports.customDb(test, common)
  module.exports.customBackend(test, common)
  module.exports.customBlobBackend(test, common)
  // module.exports.close(test, common)
}
