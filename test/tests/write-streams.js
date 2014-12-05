var fs = require('fs')
var path = require('path')
var os = require('os')
var crypto = require('crypto')
var mbstream = require('multibuffer-stream')
var buff = require('multibuffer')
var bops = require('bops')
var protobuf = require('protocol-buffers')
var concat = require('concat-stream')
var json = require('json-protobuf-encoding')
var debug = require('debug')('test.write-streams')

var proto = function(sch) {
  return protobuf(sch, {encodings:{json:json()}}).Row
}

module.exports.blobWriteStream = function(test, common) {
  test('piping a blob into a blob write stream', function(t) {
    common.getDat(t, function(dat, done) {
      
      var ws = dat.createBlobWriteStream('write-streams.js', function(err, doc) {
        t.notOk(err, 'no blob write err')
        var blob = doc.blobs['write-streams.js']
        t.ok(blob, 'doc has blob')
        t.ok(blob.size, 'blob has size')
        t.ok(blob.key, 'blob has key')
        done()
      })
      
      fs.createReadStream(path.join(__dirname, 'write-streams.js')).pipe(ws)
    })
  })
}

module.exports.blobReadStream = function(test, common) {
  test('getting a blob read stream by row key + name', function(t) {
    common.getDat(t, function(dat, done) {
      
      var ws = dat.createBlobWriteStream('write-streams.js', function(err, doc) {
        t.notOk(err, 'no blob write err')
        var blob = doc.blobs['write-streams.js']
        t.ok(blob, 'doc has blob')
        
        var rs = dat.createBlobReadStream(doc.key, 'write-streams.js')

        rs.on('error', function(e) {
          t.false(e, 'no read stream err')
          done()
        })

        rs.pipe(concat(function(file) {
          t.equal(file.length, blob.size, 'blob size is correct')
          done()
        }))
      })
      
      fs.createReadStream(path.join(__dirname, 'write-streams.js')).pipe(ws)
    })
  })
}


module.exports.blobExists = function(test, common) {
  test('check if a blob exists in the local blob store', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createBlobWriteStream('write-streams.js', function(err, doc) {
        t.notOk(err, 'no blob write err')
        dat.blobs.backend.exists(doc.blobs['write-streams.js'], function(err, exists) {
          t.ok(exists, 'blob exists')
          dat.blobs.backend.exists({key: 'not-a-valid-hash'}, function(err, exists) {
            t.notOk(exists, 'invalid hash does not exist')
            done()
          })
        })
      })
      fs.createReadStream(path.join(__dirname, 'write-streams.js')).pipe(ws)
    })
  })
}

module.exports.singleNdjsonObject = function(test, common) {
  test('piping a single ndjson object into a write stream', function(t) {
    common.getDat(t, function(dat, done) {

      var ws = dat.createWriteStream({ json: true, quiet: true })

      ws.on('finish', function() {
    
        var cat = dat.createReadStream()
    
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].batman, "bruce wayne")
          done()
        }))
      })
    
      ws.write(bops.from(JSON.stringify({"batman": "bruce wayne"})))
      ws.end()
    })
  })
}

module.exports.singleNdjsonString = function(test, common) {
  test('piping a single ndjson string into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ json: true, quiet: true })
    
      ws.on('finish', function() {
    
        var cat = dat.createReadStream()
      
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].batman, "bruce wayne")
          done()
        }))
      
      })
    
      ws.write(JSON.stringify({"batman": "bruce wayne"}))
      ws.end()
    })
  })
}

module.exports.multipleNdjsonObjects = function(test, common) {
  test('piping multiple ndjson objects into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ json: true, quiet: true })
    
      ws.on('finish', function() {
      
        var cat = dat.createReadStream()
      
        cat.pipe(concat(function(data) {
          debug('data', data)
          t.equal(data.length, 2)
          t.equal(data[0].foo, "bar")
          t.equal(data[1].foo, "baz")
          done()
        }))
      
      })
    
      ws.write(bops.from(JSON.stringify({"foo": "bar"}) + os.EOL))
      ws.write(bops.from(JSON.stringify({"foo": "baz"})))
      ws.end()
    
    })
  })
}


module.exports.singleNdjsonObjectKeyOnly = function(test, common) {
  test('piping a single ndjson object w/ only key into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ json: true, quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          debug('data', data)
          t.equal(data.length, 1)
          t.equal(data[0].key, "foo")
          done()
        }))
      })
    
      ws.write(bops.from(JSON.stringify({"key": "foo"})))
      ws.end()
    })
  })
}

module.exports.singleBuff = function(test, common) {
  test('piping a single row of buff data with write stream', function(t) {
  
    var schema = proto('message Row { optional json foo = 1; }')
    var row = schema.encode({foo:'bar'})
  
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ columns: ['foo'], protobuf: true, quiet: true })
    
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].foo, 'bar')
          done()
        }))
      })
    
      var packStream = mbstream.packStream()
      packStream.pipe(ws)
      packStream.write(row)
      packStream.end()
    
    })
  })
}

module.exports.multipleBuffs = function(test, common) {
  test('piping multiple rows of buff data with write stream', function(t) {

    var schema = proto('message Row { optional json a = 1; optional json b = 2; }')
    var row1 = schema.encode({a:'1',b:'2'})
    var row2 = schema.encode({a:'3',b:'4'})

    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ columns: ['a', 'b'], protobuf: true, quiet: true })
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          t.equal(data.length, 2)
          t.equal(data[0].a, '1')
          t.equal(data[0].b, '2')
          t.equal(data[1].a, '3')
          t.equal(data[1].b, '4')
          done()
        }))
      })
    
      var packStream = mbstream.packStream()
      packStream.pipe(ws)
      packStream.write(row1)
      packStream.write(row2)
      packStream.end()
    
    })
  })
}

module.exports.csvOneRow = function(test, common) {
  test('piping a csv with 1 row into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ csv: true, quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].a, '1')
          t.equal(data[0].b, '2')
          t.equal(data[0].c, '3')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n1,2,3'))
      ws.end()
    
    })
  })
}

module.exports.csvMultipleRows = function(test, common) {
  test('piping a csv with multiple rows into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ csv: true, quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          t.equal(data.length, 2)
          t.equal(data[0].a, '1')
          t.equal(data[0].b, '2')
          t.equal(data[0].c, '3')
          t.equal(data[1].a, '4')
          t.equal(data[1].b, '5')
          t.equal(data[1].c, '6')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n1,2,3\n4,5,6'))
      ws.end()
    
    })
  })
}

module.exports.csvCustomDelimiter = function(test, common) {
  test('piping a csv with multiple rows + custom delimiter into a write stream', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ csv: true, separator: '\t', quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          t.equal(data.length, 2)
          t.equal(data[0].a, '1')
          t.equal(data[0].b, '2')
          t.equal(data[0].c, '3')
          t.equal(data[1].a, '4')
          t.equal(data[1].b, '5')
          t.equal(data[1].c, '6')
          done()
        }))
      })
    
      ws.write(bops.from('a\tb\tc\n1\t2\t3\n4\t5\t6'))
      ws.end()
    
    })
  })
}

module.exports.multipleWriteStreams = function(test, common) {
  test('multiple writeStreams, updating rows', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ csv: true, quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          var jws = dat.createWriteStream({ json: true, quiet: true })
          jws.on('finish', function() {
            var cat = dat.createReadStream()
            cat.pipe(concat(function(data2) {

              t.equal(data.length, data2.length)
              done()
            }))
          })
          jws.write(bops.from(JSON.stringify(data[0]) + os.EOL))
          jws.write(bops.from(JSON.stringify(data[1])))
          jws.end()
        }))
      })
    
      ws.write(bops.from('a,b,c\n1,2,3\n4,5,6'))
      ws.end()
    
    })
  })
}

module.exports.multipleWriteStreamsUpdatingChanged = function(test, common) {
  test('multiple writeStreams w/ updating data + primary key only updates rows that changed', function(t) {
    common.getDat(t, function(dat, done) {
      var ws1 = dat.createWriteStream({ json: true, primary: 'foo', quiet: true })
  
      ws1.on('finish', function() {
        var ws2 = dat.createWriteStream({ json: true, primary: 'foo', quiet: true })
        
        ws2.on('conflict', function(e) {
          t.ok(e, 'should conflict')
          var cat = dat.createReadStream()
  
          cat.pipe(concat(function(data) {
            t.equal(data.length, 1)
            t.equal(data[0].foo, "bar")
            done()
          }))
        })

        ws2.write(bops.from(JSON.stringify({"foo": "bar"})))
        ws2.end()
      })
  
      ws1.write(bops.from(JSON.stringify({"foo": "bar"})))
      ws1.end()
  
    })
  })
}

module.exports.compositePrimaryKey = function(test, common) {
  test('composite primary key', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ primary: ['a', 'b'], quiet: true })
    
      ws.on('finish', function() {
        dat.get('foobar', function(err, data) {
          t.false(err, 'no error')
          t.equal(data.c, "hello")
          done()
        })
      })
    
      ws.write({"a": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
}

module.exports.compositePrimaryKeyCustomSeparator = function(test, common) {
  test('composite primary key w/ custom keySeparator', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ primary: ['a', 'b'], separator: '@', quiet: true })
    
      ws.on('finish', function() {
        dat.get('foo@bar', function(err, data) {
          t.false(err, 'no error')
          t.equal(data.c, "hello")
          done()
        })
      })
    
      ws.write({"a": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
  
}

module.exports.compositePrimaryKeyHashing = function(test, common) {
  test('composite primary key w/ composite hashing enabled', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ primary: ['a', 'b'], hash: true, quiet: true })
    
      ws.on('finish', function() {
        var key = crypto.createHash('md5').update('foobar').digest("hex")

        dat.get(key, function(err, data) {
          t.false(err, 'no error')
          t.equal(data.c, "hello")
          done()
        })
      })
    
      ws.write({"a": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
}

module.exports.compositePrimaryKeySeparator = function(test, common) {
  test('composite primary key w/ custom separator', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ primary: ['a', 'b'], separator: '-', quiet: true })
    
      ws.on('finish', function() {

        dat.get('foo-bar', function(err, data) {
          t.false(err, 'no error')
          t.equal(data.c, "hello")
          done()
        })
      })
    
      ws.write({"a": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
}

module.exports.primaryKeyFunction = function(test, common) {
  test('primary key function', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({primaryFormat: function () { return 'P-Funk' }, quiet: true})

      ws.on('finish', function() {
        dat.get('P-Funk', function(err, data) {
          t.notOk(err, 'no error')
          t.equal(data.a, 'foo')
          done()
        })
      })

      ws.write({'a': 'foo'})
      ws.end()
    })
  })
}

module.exports.primaryKeyFunctionUsingPrimaryVal = function(test, common) {
  test('primary key function', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({primary: 'a', primaryFormat: function (val) { return 'P-' + val }, quiet: true})

      ws.on('finish', function() {
        dat.get('P-Funk', function(err, data) {
          t.notOk(err, 'no error')
          t.equal(data.a, 'Funk')
          done()
        })
      })

      ws.write({'a': 'Funk'})
      ws.end()
    })
  })
}


module.exports.writeStreamConflicts = function(test, common) {
  test('csv writeStream w/ conflicting updates', function(t) {
    common.getDat(t, function(dat, done) {
      
      function writeAndVerify(obj, cb) {
        var ws = dat.createWriteStream({quiet: true})

        var conflicted
        
        ws.on('finish', function() {
          if (conflicted) return
          var cat = dat.createReadStream()
          cat.pipe(concat(function(data) {
            cb(null, data)
          }))
        })
        
        ws.on('conflict', function(e) {
          conflicted = true
          cb(e)
        })
    
        ws.write(obj)
        ws.end()
      }
      
      var ver1 = {key: 'foo', 'name': 'bob'}
      
      writeAndVerify(ver1, function(err1, stored1) {
        t.notOk(err1, 'no err')
        t.equals(stored1.length, 1, '1 row in db')
        t.equals(stored1[0].name, 'bob', 'bob is in db')
        t.equals(stored1[0].version, 1, 'bob is at ver 1')
        writeAndVerify(ver1, function(err2, stored2) {
          t.ok(err2, 'should have conflicted')
          t.equals(stored1.length, 1, '1 row in db')
          t.equals(stored1[0].name, 'bob', 'bob is in db')
          t.equals(stored1[0].version, 1, 'bob is at ver 1')
          writeAndVerify(stored1[0], function(err3, stored3) {
            t.notOk(err3, 'no err')
            t.equals(stored3.length, 1, '1 row in db')
            t.equals(stored3[0].name, 'bob', 'bob is in db')
            t.equals(stored3[0].version, 2, 'bob is at ver 2')
            done()
          })
        })
      })
    
    })
  })
}


module.exports.writeStreamCsvNoHeaderRow = function(test, common) {
  test('csv writeStream w/ headerRow false', function(t) {
    common.getDat(t, function(dat, done) {
    
      var ws = dat.createWriteStream({ csv: true, columns: ['foo'], headerRow: false, quiet: true })
    
      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].foo, 'bar')
          done()
        }))
      })
    
      ws.write(bops.from('bar'))
      ws.end()
    
    })
  })
}

module.exports.writeStreamMultipleWithRandomKeys = function(test, common) {
  test('writeStream same json multiple times (random key generation)', function(t) {
    common.getDat(t, function(dat, done) {
      var ws1 = dat.createWriteStream({ json: true, quiet: true })
    
      ws1.on('finish', function() {
        var ws2 = dat.createWriteStream({ json: true, quiet: true })
      
        ws2.on('finish', function() {
          var cat = dat.createReadStream()
    
          cat.pipe(concat(function(data) {
            t.equal(data.length, 2)
            t.equal(data[0].foo, "bar")
            t.equal(data[1].foo, "bar")
            done()
          }))
        })
      
        ws2.write(bops.from(JSON.stringify({"foo": "bar"})))
        ws2.end()
      })
    
      ws1.write(bops.from(JSON.stringify({"foo": "bar"})))
      ws1.end()
    
    })
  })
}

module.exports.multipleCSVWriteStreamsChangingSchemas = function(test, common) {
  test('multiple CSV writeStreams w/ different schemas', function(t) {
    common.getDat(t, function(dat, done) {
      var ws1 = dat.createWriteStream({ csv: true, quiet: true })
  
      ws1.on('finish', function() {
        var ws2 = dat.createWriteStream({ csv: true, quiet: true })

        ws2.on('error', function(e) {
          t.equal(e.type, 'columnMismatch', 'column mismatch')
          done()
        })
        
        ws2.write(bops.from('d,e,f\nfoo,bar,baz'))
        ws2.end()
      })
  
      ws1.write(bops.from('a,b,c\n1,2,3\n4,5,6'))
      ws1.end()
    })
  })
}

module.exports.csvWithVersionKey = function (test, common) {
  test('csv with version key', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({csv: true, quiet: true})
      ws.write(bops.from('a,b,version\n1,2,3\n1,2,\n1,2,missing'))
      ws.end()
      ws.on('finish', function () {
        dat.createReadStream().pipe(concat(function (rows) {
          t.equals(rows[0].version, 3)
          t.equals(rows[1].version, 1)
          t.equals(rows[2].version, 1)
          done()
        }))
      })
    })
  })
}

module.exports.keepTotalRowCount = function(test, common) {
  test('keeps row count for streams', function(t) {
    common.getDat(t, function(dat, done) {

      var ws = dat.createWriteStream({ csv: true, quiet: true })

      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          dat.getRowCount(function(err, rows) {
            t.equal(rows, 2)
            done()
          })
        }))
      })

      ws.write(bops.from('a,b,c\n1,2,3\n4,5,6'))
      ws.end()

    })
  })

  test('keeps row count for streams after updates', function(t) {
    common.getDat(t, function(dat, done) {
      var ws1 = dat.createWriteStream({ json: true, quiet: true })

      ws1.on('finish', function() {
        var ws2 = dat.createWriteStream({ json: true, quiet: true })

        ws2.on('conflict', function(e) {
          var cat = dat.createReadStream()

          cat.pipe(concat(function(data) {
            t.equal(data.length, 1)
            dat.getRowCount(function(err, rows) {
              t.equal(rows, 1)
              done()
            })
          }))
        })

        ws2.write(bops.from(JSON.stringify({'key': 'foo'})))
        ws2.end()
      })

      ws1.write(bops.from(JSON.stringify({'key': 'foo'})))
      ws1.end()

    })
  })
}

module.exports.detectInputType = function (test, common) {
  test('detect csv input', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quiet: true})
      var formatData = {}
      ws.once('detect', function (data) {
        formatData = data
      })

      ws.on('finish', function() {
        var cat = dat.createReadStream()
        cat.pipe(concat(function(data) {
          t.equals(formatData.format, 'csv', 'csv format')
          t.equals(formatData.separator, ',', 'comma separator')
          t.equals(data[0].a, '1', 'first row')
          t.equals(data[1].b, '5', 'second row')
          done()
        }))
      })

      ws.write(bops.from('a,b,c\n1,2,3\n4,5,6'))
      ws.end()
    })
  })
  
  test('detect json input (array style)', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quet: true})
      var formatData = {}
      ws.on('detect', function (data) {
        formatData = data
      })
      
      ws.on('finish', function () {
        var cat = dat.createReadStream()
        cat.pipe(concat(function (data) {
          t.equals(formatData.format, 'json', 'json format')
          t.equals(formatData.style, 'array', 'array style')
          t.equals(data[0].a, 1, 'first row')
          t.equals(data[1].a, 2, 'second row')
          done()
        }))
      })
      
      ws.write(bops.from(JSON.stringify([{a: 1}, {a: 2}])))
      ws.end()
    })
  })

  test('detect json input (object style)', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quet: true})
      var formatData = {}
      ws.on('detect', function (data) {
        formatData = data
      })
      
      ws.on('finish', function () {
        var cat = dat.createReadStream()
        cat.pipe(concat(function (data) {
          t.equals(formatData.format, 'json', 'json format')
          t.equals(formatData.style, 'object', 'object style')
          t.equals(formatData.selector, 'rows.*', 'correct selector')
          t.equals(data[0].a, 1, 'first row')
          t.equals(data[1].a, 2, 'second row')
          done()
        }))
      })
      
      ws.write(bops.from(JSON.stringify({rows: [{a: 1}, {a: 2}]})))
      ws.end()
    })
  })

  test('detect json input (multiline style)', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quet: true})
      var formatData = {}
      ws.on('detect', function (data) {
        formatData = data
      })
      
      ws.on('finish', function () {
        var cat = dat.createReadStream()
        cat.pipe(concat(function (data) {
          t.equals(formatData.format, 'json', 'json format')
          t.equals(formatData.style, 'multiline', 'multiline style')
          t.equals(data[0].a, 1, 'first row')
          t.equals(data[1].a, 2, 'second row')
          done()
        }))
      })
      
      ws.write(bops.from(JSON.stringify({a: 1})))
      ws.write(bops.from(JSON.stringify({a: 2})))
      ws.end()
    })
  })

  test('detect json input (object style cutoff)', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quet: true, detectMax: 20})
      var formatData = {}
      ws.on('detect', function (data) {
        formatData = data
      })
      
      ws.on('finish', function () {
        var cat = dat.createReadStream()
        cat.pipe(concat(function (data) {
          t.equals(formatData.format, 'json', 'json format')
          t.equals(formatData.style, 'object', 'object style')
          t.equals(formatData.selector, 'rows.*', 'correct selector')
          t.equals(data[0].a, 1, 'first row')
          t.equals(data[1].a, 2, 'second row')
          done()
        }))
      })
      var testBuffer = bops.from(JSON.stringify({rows: [{a: 1}, {a: 2}]}))
      ws.write(testBuffer.slice(0,20))
      ws.write(testBuffer.slice(20))
      ws.end()
    })
  })

  test('err message when unable to detect input', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({quet: true})
      var formatData = {}
      ws.on('error', function (err) {
        t.ok(err.message.indexOf('ould not auto detect') > 0,
        'could not auto detect err message')
        done()
      })

      ws.write(bops.from('undetectable'))
      ws.end()
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.blobWriteStream(test, common)
  module.exports.blobReadStream(test, common)
  module.exports.blobExists(test, common)
  module.exports.singleNdjsonObject(test, common)
  module.exports.singleNdjsonString(test, common)
  module.exports.multipleNdjsonObjects(test, common)
  module.exports.singleNdjsonObjectKeyOnly(test, common)
  module.exports.singleBuff(test, common)
  module.exports.multipleBuffs(test, common)
  module.exports.csvOneRow(test, common)
  module.exports.csvMultipleRows(test, common)
  module.exports.csvCustomDelimiter(test, common)
  module.exports.multipleWriteStreams(test, common)
  module.exports.multipleWriteStreamsUpdatingChanged(test, common)
  module.exports.compositePrimaryKey(test, common)
  module.exports.compositePrimaryKeyCustomSeparator(test, common)
  module.exports.compositePrimaryKeyHashing(test, common)
  module.exports.compositePrimaryKeySeparator(test, common)
  module.exports.primaryKeyFunction(test, common)
  module.exports.primaryKeyFunctionUsingPrimaryVal(test, common)
  module.exports.writeStreamConflicts(test, common)
  module.exports.writeStreamCsvNoHeaderRow(test, common)
  module.exports.writeStreamMultipleWithRandomKeys(test, common)
  module.exports.multipleCSVWriteStreamsChangingSchemas(test, common)
  module.exports.csvWithVersionKey(test, common)
  module.exports.keepTotalRowCount(test, common)
  module.exports.detectInputType(test, common)
}
