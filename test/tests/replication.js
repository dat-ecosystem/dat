var os = require('os')
var fs = require('fs')
var path = require('path')
var bops = require('bops')
var concat = require('concat-stream')
var Dat = require('../../')

module.exports.pullReplication = function(test, common) {
  test('pull replication', function(t) {
    var expected = ["1", "2"]
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var ws = dat.createWriteStream({ csv: true, quiet: true })
        var nums = []
        
        ws.on('finish', function() {
          dat2.pull({ quiet: true }, function(err) {
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

module.exports.pullReplicationBlob = function(test, common) {
  test('pull replication should copy blobs', function(t) {
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {

        var ws = dat.createBlobWriteStream('foo.txt', function(err, doc) {
          t.notOk(err, 'no blob write err')
          t.ok(doc.blobs['foo.txt'], 'doc has blob')
          pull(doc)
        })

        ws.write('bar')
        ws.end()

        function pull(doc) {
          dat2.pull({ quiet: true }, function(err) {
            if (err) throw err
            var blobRead = dat2.blobs.createReadStream(doc.blobs['foo.txt'])
            blobRead.on('error', function(e) {
              t.notOk(e, 'should not error')
              done()
            })
            blobRead.pipe(concat(function(data) {
              t.equals(data.toString(), 'bar', 'data matches')
              done()
            }))
          })
        }

        function done() {
          dat2.destroy(function(err) {
            t.false(err, 'no destroy err')
            cleanup()
          })
        }
      })
    })
  })
}

module.exports.pullReplicationSparse = function(test, common) {
  test('pull replication with sparse data', function(t) {
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var ws = dat.createWriteStream({ quiet: true })
        
        ws.on('finish', function() {
          dat2.pull({ quiet: true },function(err) {
            if (err) throw err
            dat.createReadStream().pipe(concat(function(db1) {
              dat2.createReadStream().pipe(concat(function(db2) {
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
            dat2.pull({ quiet: true }, function(err) {
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
    var dat2 = new Dat(common.dat2tmp, function ready() {
      common.getDat(t, function(dat, cleanup) {
        var pull = dat2.pull({ quiet: true, live: true })
        dat.put({foo: 'bar'}, function(err) {
          if (err) throw err
          var ok = false
          
          dat2.createChangesReadStream({ live: true, data: true, decode: true }).on('data', function(change) {
            if (change.subset) return
            var data = change.value
            ok = true
            t.equal(data.foo, 'bar', 'change matches')
            pull.end()
            dat2.destroy(function(err) {
              if (err) throw err
              cleanup()
            })
          })

          setTimeout(function() {
            if (!ok) {
              t.ok(ok, 'should not time out but did')
              cleanup()
            }
          }, 10000)
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
        
        dat2.listen(function(err) {
          if (err) throw err
          dat2port = dat2._server.address().port
        
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
          dat.push('http://localhost:' + dat2port, { quiet: true}, function(err) {
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

module.exports.pushReplicationURLNormalize = function(test, common) {
  test('push replication w/ non normalized url', function(t) {
    var expected = ["pizza", "walrus"]
    common.getDat(t, function(dat, cleanup) {
      var doc1 = {a: 'pizza'}
      var doc2 = {a: 'walrus'}
      var dat2port
      
      var dat2 = new Dat(common.dat2tmp, function ready(err) {
        if (err) throw err
        
        dat2.listen(function(err) {
          if (err) throw err
        
          dat2port = dat2._server.address().port
        
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
          dat.push('localhost:' + dat2port, { quiet: true}, function(err) {
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
          var remote = 'http://localhost:' + dat.options.port
          dat2.clone(remote, { quiet: true }, function(err) {
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

module.exports.skimClone = function(test, common) {
  test('clone --skim from remote', function(t) {
    common.getDat(t, function(dat, cleanup) {
      
      dat.put({key: 'foo'}, function(err, stored) {
        if (err) throw err
        
        var ws = dat.createBlobWriteStream('write-streams.js', stored, function(err, doc) {
          t.notOk(err, 'no blob write err')
          var dat2 = new Dat(common.dat2tmp, { init: false }, function ready() {
            var remote = 'http://localhost:' + dat.options.port
            dat2.clone(remote, { path: common.dat2tmp, quiet: true, skim: true }, function(err) {
              t.notOk(err, 'no err on clone')
              verify(dat2)
            })
          })
          
          function verify(dat2) {
            dat2.get('foo', function(err, row) {
              t.notOk(err, 'no get err')
              t.equal(row.key, 'foo', 'got foo')
              
              dat2.blobs.backend.exists(row.blobs['write-streams.js'], function(err, exists) {
                t.notOk(exists, 'blob is not in local blob backend')
                
                var rs = dat2.createBlobReadStream('foo', 'write-streams.js')
                rs.pipe(concat(function(contents) {
                  t.equal(contents.length, row.blobs['write-streams.js'].size, 'blob size matches')
                  
                  dat2.destroy(function(err) {
                    if (err) throw err
                    cleanup()
                  })
                  
                }))
                
              })
            })
          }
          
        })
      
        fs.createReadStream(path.join(__dirname, 'replication.js')).pipe(ws)
      })
    })
  })
}


module.exports.all = function (test, common) {
  module.exports.pullReplication(test, common)
  module.exports.pullReplicationBlob(test, common)
  module.exports.pullReplicationSparse(test, common)
  module.exports.pullReplicationMultiple(test, common)
  module.exports.pullReplicationLive(test, common)
  module.exports.pushReplication(test, common)
  module.exports.pushReplicationURLNormalize(test, common)
  module.exports.remoteClone(test, common)
  module.exports.skimClone(test, common)
}
