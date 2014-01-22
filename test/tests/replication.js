var bops = require('bops')
var concat = require('concat-stream')
var Dat = require('../../')

module.exports.pullReplication = function(test, common) {
  test('pull replication', function(t) {
    var expected = ["1", "2"]
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var ws = dat.createWriteStream({ csv: true })
        var nums = []
    
        ws.on('close', function() {
          common.serveAndPull(dat, dat2, function() {
            common.compareData(t, dat, dat2, function() {
              done()
            })
          })
        })
    
        ws.write(bops.from('a\n1\n2'))
        ws.end()
 
        function done() {
          dat2.createReadStream().pipe(concat(function(data) {
            var results = data.map(function(r) { return r.a })
            t.equals(JSON.stringify(results), JSON.stringify(expected), 'createReadStream() matches')
            dat.close() // stops http server
            dat2.destroy(function(err) {
              t.false(err, 'no err')
              cleanup()
            })
          }))
        }
    
      })
    })
  })
}

module.exports.pullReplicationMultiple = function(test, common) {
  test('multiple pulls', function(t) {
    var expected = ["pizza", "walrus"]
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var doc1 = {a: 'pizza'}
        var doc2 = {a: 'walrus'}
    
        putPullCompare(doc1, function() {
          putPullCompare(doc2, function() {
            done()
          })
        })

        function putPullCompare(doc, cb) {
          dat.put(doc, function(err, doc) {
            if (err) throw err
            common.serveAndPull(dat, dat2, function() {
              common.compareData(t, dat, dat2, function() {
                cb()
              })
            })
          })
        }
      
        function done() {
          dat2.createReadStream().pipe(concat(function(data) {
            var results = data.map(function(r) { return r.a })
            t.equals(JSON.stringify(results), JSON.stringify(expected), 'createReadStream() matches')
            dat.close() // stops http server
            dat2.destroy(function(err) {
              t.false(err, 'no err')
              cleanup()
            })
          }))
        }
      })
    })
  })
}

module.exports.pullReplicationLive = function(test, common) {
  test('live pull replication', function(t) {
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        dat.serve(function(err) {
          if (err) throw err
          var pull = dat2.pull({live: true})
          dat.put({foo: 'bar'}, function(err) {
            if (err) throw err
            setTimeout(function() {
              dat2.createReadStream().pipe(concat(function(data) {
                t.equal(data.length, 1)
                t.equal(data[0].foo, 'bar')
                pull.stream.end()
                dat.close() // stops http server
                dat2.destroy(function(err) {
                  if (err) throw err
                  cleanup()
                })
              }))
            }, 250)
          })
        })
      })
    })
  })
}

module.exports.tarballInit = function(test, common) {
  test('init from remote using tarball', function(t) {
    var dat2 = new Dat(common.dat2tmp, {init: false}, function ready() {
      common.getDat(t, function(dat, cleanup) {
        dat.put({foo: 'bar'}, function(err) {
          if (err) throw err
          dat.serve(function(err) {
            if (err) throw err
            dat2.init({remote: 'http://localhost:' + dat.defaultPort}, function(err, msg) {
              if (err) throw err
              dat2.createReadStream().pipe(concat(function(data) {
                t.equal(data.length, 1)
                t.equal(data[0].foo, 'bar')
                dat.close() // stops http server
                dat2.destroy(function(err) {
                  if (err) throw err
                  cleanup()
                })
              }))
            })
          })
        })
      })
    })
  })
}

module.exports.pushReplication = function(test, common) {
  test('push replication', function(t) {
    var expected = ["pizza", "walrus"]
    var dat2 = new Dat(common.dat2tmp, {init: false}, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var doc1 = {a: 'pizza'}
        var doc2 = {a: 'walrus'}
    
        dat2.init(function(err) {
          if (err) throw err
    
          dat2.serve(function(err) {
            putPushCompare(doc1, function() {
              putPushCompare(doc2, function() {
                done()
              })
            })
          })
        })

        function putPushCompare(doc, cb) {
          dat.put(doc, function(err, doc) {
            if (err) throw err
            dat.push('http://localhost:' + dat.defaultPort, function(err) {
              if (err) throw err
              common.compareData(t, dat, dat2, function() {
                cb()
              })                
            })
          })
        }
      
        function done() {
          dat2.createReadStream().pipe(concat(function(data) {
            var results = data.map(function(r) { return r.a })
            t.equals(JSON.stringify(results), JSON.stringify(expected), 'createReadStream() matches')
            dat2.close() // stops http server
            dat2.destroy(function(err) {
              t.false(err, 'no err')
              cleanup()
            })
          }))
        }
      })
    })
  })
}


module.exports.all = function (test, common) {
  module.exports.pullReplication(test, common)
  module.exports.pullReplicationMultiple(test, common)
  module.exports.pullReplicationLive(test, common)
  module.exports.pushReplication(test, common)
  module.exports.tarballInit(test, common)
}
