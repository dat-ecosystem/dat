var bops = require('bops')
var concat = require('concat-stream')
var Dat = require('../../')
var os = require('os')

module.exports.pullReplication = function(test, common) {
  test('pull replication', function(t) {
    var expected = ["1", "2"]
    var dat2 = new Dat(common.dat2tmp, { serve: false }, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var ws = dat.createWriteStream({ csv: true })
        var nums = []
        
        ws.on('end', function() {
          dat2.pull(function(err) {
            if (err) throw err
            common.compareData(t, dat, dat2, function() {
              done()
            })
          })
        })
        
        ws.write(bops.from('a\n1\n2'))
        ws.end()
        
        function done() {
          var rs = dat2.createReadStream()
          rs.pipe(concat(function(data) {
            var results = data.map(function(r) { return r.a })
            t.equals(JSON.stringify(results), JSON.stringify(expected), 'createReadStream() matches')
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

module.exports.pullReplicationSparse = function(test, common) {
  test('pull replication with sparse data', function(t) {
    var dat2 = new Dat(common.dat2tmp, { serve: false }, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var ws = dat.createWriteStream({ objects: true })
        
        ws.on('end', function() {
          dat2.pull(function(err) {
            if (err) throw err
            dat.createReadStream().pipe(concat(function(db1) {
              dat2.createReadStream().pipe(concat(function(db2) {
                // HACK since revisions have a hashed based on the row buffer which is non deterministic w/ sparse data
                function removeRevs(docs) { return docs.map(function(d) { delete d._rev; return d } )}
                db1 = removeRevs(db1)
                db2 = removeRevs(db2)
                t.deepEquals(db1, db2, 'low level data matches')
                done()
              }))
            }))
          })
        })
        
        ws.on('error', function(e) {
          t.notOk(e, e.message)
        })
        
        ws.write({"doc1": "val1"})
        ws.write({"doc2": "val2"})
        ws.write({"doc3": "val3"})
        ws.end()
        
        function done() {
          dat2.destroy(function(err) {
            t.false(err, 'no err')
            cleanup()
          })
        }
      })
    })
  })
}

module.exports.pullReplicationMultiple = function(test, common) {
  test('multiple pulls', function(t) {
    var expected = ["pizza", "walrus"]
    var dat2 = new Dat(common.dat2tmp, { serve: false }, function ready() {
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
            dat2.pull(function(err) {
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
    var dat2 = new Dat(common.dat2tmp, { serve: false }, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var pull = dat2.pull({ live: true })
        dat.put({foo: 'bar'}, function(err) {
          if (err) throw err
          setTimeout(function() {
            dat2.createReadStream().pipe(concat(function(data) {
              t.equal(data.length, 1)
              if (data.length) t.equal(data[0].foo, 'bar')
              pull.stream.end()
              dat2.destroy(function(err) {
                if (err) throw err
                cleanup()
              })
            }))
          }, 500)
        })
      })
    })
  })
}

module.exports.pushReplication = function(test, common) {
  test('push replication', function(t) {
    var expected = ["pizza", "walrus"]
    common.getDat(t, function(dat, cleanup) {
      var doc1 = {a: 'pizza'}
      var doc2 = {a: 'walrus'}
      var dat2port
      
      var dat2 = new Dat(common.dat2tmp, function ready(err) {
        if (err) throw err
        dat2port = dat2._server.address().port
        
        putPushCompare(doc1, function() {
          putPushCompare(doc2, function() {
            done()
          })
        })
      })

      function putPushCompare(doc, cb) {
        dat.put(doc, function(err, doc) {
          if (err) throw err
          dat.push('http://localhost:' + dat2port, function(err) {
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
          dat2.destroy(function(err) {
            t.false(err, 'no err')
            cleanup()
          })
        }))
      }
    })
  })
}

module.exports.remoteClone = function(test, common) {
  test('clone from remote', function(t) {
    common.getDat(t, function(dat, cleanup) {
      
      dat.put({foo: 'bar'}, function(err) {
        if (err) throw err
        var dat2 = new Dat(common.dat2tmp, { init: false }, function ready() {
          var remote = 'http://localhost:' + dat.defaultPort
          dat2.clone({ remote: remote, path: common.dat2tmp }, function(err) {
            t.notOk(err, 'no err on clone')
            verify(dat2)
          })
        })
      })
      
      function verify(dat2) {
        dat2.createReadStream().pipe(concat(function(data) {
          t.equal(data.length, 1)
          var first = data[0] || {}
          t.equal(first.foo, 'bar')
          dat2.destroy(function(err) {
            if (err) throw err
            cleanup()
          })
        }))
      }
      
    })
  })
}


module.exports.all = function (test, common) {
  module.exports.pullReplication(test, common)
  module.exports.pullReplicationSparse(test, common)
  module.exports.pullReplicationMultiple(test, common)
  module.exports.pullReplicationLive(test, common)
  module.exports.pushReplication(test, common)
  module.exports.remoteClone(test, common)
}
