var through2 = require('through2')
var mbstream = require('multibuffer-stream')
var buff = require('multibuffer')
var bops = require('bops')
var concat = require('concat-stream')
var os = require('os')
var protobuf = require('protocol-buffers')
var json = require('json-protobuf-encoding')
var ndjson = require('ndjson')

var proto = function(sch) {
  return protobuf(sch, {encodings:{json:json()}}).Row
}

module.exports.readStreamBuff = function(test, common) {
  test('readStream returns all buff rows', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ columns: ['num'], protobuf: true, quiet: true })
      var nums = []
    
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          var results = data.map(function(r) { return r.num })
          t.equals(JSON.stringify(nums.sort()), JSON.stringify(results.sort()), 'matches')
          done()
        }))
      })

      var packStream = mbstream.packStream()
      packStream.pipe(ws)
      var schema = proto('message Row { optional json num = 1; }')

      // create a bunch of single cell buff rows with incrementing integers in them
      for (var i = 0; i < 1000; i++) {
        packStream.write(schema.encode({num:i+''}))
        nums.push(i + '')
      }
      packStream.end()
    })
  })
}

module.exports.readStreamBuffPrimaryKey = function(test, common) {
  test('readStream returns all buff rows w/ custom primary key', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ columns: ['num'], primary: 'num', protobuf: true, quiet: true })
      var nums = []
    
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          var results = data.map(function(r) { return r.num })
          t.equals(JSON.stringify(nums.sort()), JSON.stringify(results.sort()), 'matches')
          done()
        }))
      })
    
      var packStream = mbstream.packStream()
      packStream.pipe(ws)
    
      var schema = proto('message Row { optional json num = 1; }')

      // create a bunch of single cell buff rows with incrementing integers in them
      for (var i = 0; i < 1000; i++) {
        packStream.write(schema.encode({num:i+''}))
        nums.push(i + '')
      }
    
      packStream.end()
    })
  })
}

module.exports.readStreamCsvPrimaryKey = function(test, common) {
  test('readStream returns all csv rows w/ custom primary key', function(t) {
    var expected = ['1', '10', '100']
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, primary: 'a', quiet: true })
      var nums = []
    
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          var results = data.map(function(r) { return r.key })
          t.equals(JSON.stringify(results.sort()), JSON.stringify(expected.sort()), 'matches')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n1,1,1\n10,1,1\n100,1,1'))
      ws.end()
    })
  })
}

module.exports.readStreamNdjPrimaryKey = function(test, common) {
  test('readStream returns all ndjson rows w/ custom primary key', function(t) {
    var expected = ['1', '10', '100']
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ json: true, primary: 'a', quiet: true })
      var nums = []
    
      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(data) {
          var results = data.map(function(r) { return r.key })
          t.equals(JSON.stringify(results.sort()), JSON.stringify(expected.sort()), 'order matches')
          done()
        }))
      })
    
      ws.write(bops.from(JSON.stringify({"a": "1", "b": "foo"}) + os.EOL))
      ws.write(bops.from(JSON.stringify({"a": "10", "b": "foo"}) + os.EOL))
      ws.write(bops.from(JSON.stringify({"a": "100", "b": "foo"})))
      ws.end()
    })
  })
}

module.exports.getChanges = function(test, common) {
  test('getChanges', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, quiet: true })
    
      ws.on('finish', function() {
        dat.createChangesReadStream({data: true}).pipe(concat(function(data) {
          var changes = data.map(function(r) { return r.change })
          t.equal(JSON.stringify(changes), JSON.stringify([1,2,3,4,5,6]) , 'ordered changes 1 - 6 exist') // 5 rows + 1 schema
          t.equal(!!data[0].value, true)
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1\n1,1,1\n1,1,1'))
      ws.end()
    })
  })
}

module.exports.changesStream = function(test, common) {
  test('simple put should trigger a change', function(t) {
    common.getDat(t, function(dat, done) {
      var changes = dat.createChangesReadStream({ live: true, data: true, decode: true })
      var gotChange = false
      setTimeout(function() {
        if (gotChange) return
        t.false(true, 'timeout')
        setImmediate(done)
      }, 1000)
      
      changes.pipe(through2({objectMode: true}, function(obj, enc, next) {
        if (obj.subset) return next()
        changes.destroy()
        t.equal(obj.value.foo, "bar")
        gotChange = true
        setImmediate(done)
      }))
      
      dat.put({"foo": "bar"}, function(err, doc) {
        if (err) throw err
      })
    })
  })
}

module.exports.changesStreamTail = function(test, common) {
  test('createChangesStream tail:true', function(t) {
    common.getDat(t, function(dat, done) {
      
      dat.put({"foo": "old"}, function(err) {
        t.notOk(err, 'should not err')
        
        var changes = dat.createChangesReadStream({ live: true, tail: true, data: true, decode: true })
        var gotChange = false
        setTimeout(function() {
          if (gotChange) return
          t.false(true, 'timeout')
          setImmediate(done)
        }, 1000)
      
        changes.pipe(through2({objectMode: true}, function(obj, enc, next) {
          if (obj.subset) return next()
          changes.destroy()
          t.equal(obj.value.foo, "new", 'should only get new row, not old row')
          gotChange = true
          setImmediate(done)
        }))
      
        dat.put({"foo": "new"}, function(err) {
          t.notOk(err, 'should not err')
        })
      })

    })
  })
}

module.exports.changesStreamTailNum = function(test, common) {
  test('createChangesStream tail:1', function(t) {
    common.getDat(t, function(dat, done) {
      
      var ws = dat.createWriteStream({quiet: true})
      
      ws.on('error', function(err) {
        t.notOk(err)
        setImmediate(done)
      })
      
      ws.on('finish', function() {
        var changes = dat.createChangesReadStream({ live: true, tail: 1, data: true, decode: true })

        var gotChange = false
        setTimeout(function() {
          if (gotChange) return
          t.false(true, 'timeout')
          setImmediate(done)
        }, 1000)
      
        changes.pipe(through2({objectMode: true}, function(obj, enc, next) {
          if (obj.subset) return next()
          changes.destroy()
          t.equal(obj.value.foo, "taco", 'should only get 1 newest row, not older rows')
          gotChange = true
          setImmediate(done)
          next()
        }))
      })
      
      ws.write({'foo': 'bar'})
      ws.write({'foo': 'baz'})
      ws.write({'foo': 'taco'})
      ws.end()
      
    })
  })
}

module.exports.createReadStream = function(test, common) {
  test('createReadStream', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, quiet: true })
    
      ws.on('finish', function() {
        var readStream = dat.createReadStream()
        readStream.pipe(concat(function(rows) {
          t.equal(rows.length, 5, '5 rows')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1\n1,1,1\n1,1,1'))
      ws.end()
    })
  })
}

module.exports.createReadStreamStartEndKeys = function(test, common) {
  test('createReadStream w/ start + end keys', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, primary: 'a', quiet: true })
    
      ws.on('finish', function() {
        var readStream = dat.createReadStream({ start: '2', end: '4'})
        readStream.pipe(concat(function(rows) {
          t.equal(rows.length, 3, '3 rows')
          t.equal(rows[0].a, '2')
          t.equal(rows[1].a, '3')
          t.equal(rows[2].a, '4')
          done()
        }))
      })
    
      ws.write(bops.from('a\n1\n2\n3\n4\n5'))
      ws.end()
    })
  })
}

module.exports.createReadStreamFormats = function (test, common) {
  test('createReadStream json', function (t) {
    common.getDat(t, function (dat, done) {
      var ws = dat.createWriteStream({primary: 'a', quiet: true})
      ws.on('finish', csvFormat)
      ws.write({a: 1})
      ws.write({a: 2})
      ws.write({a: 3})
      ws.end()
      
      function csvFormat() {
        var rs = dat.createReadStream({ csv: true })
        rs.pipe(concat(function(data) {
          var rows = data.split('\n')
          t.equal(rows[0].split(',').length, 3, 'csv header')
          t.equal(rows[1].split(',').length, 3, 'csv first row')
          t.equal(rows.length, 5, 'csv length')
          jsonStyleObject()
        }))
      }
      
      function jsonStyleObject() {
        var rs = dat.createReadStream({format: 'json'})
        rs.pipe(concat(function (data) {
          var json = JSON.parse(data)
          t.equals(json.rows.length, 3, 'json object style length')
          t.equals(json.rows[0].a, 1, 'json object style data')
          t.equals(Object.keys(json.rows[0]).length, 3, 'json object style keys')
          jsonStyleArray()
        }))
      }
      
      function jsonStyleArray() {
        var rs = dat.createReadStream({format: 'json', style: 'array'})
        rs.pipe(concat(function (data) {
          var json = JSON.parse(data)
          t.equals(json.length, 3, 'json array style length')
          t.equals(json[0].a, 1, 'json array style data')
          t.equals(Object.keys(json[0]).length, 3, 'json object style keys')
          ndjsonFormat()
        }))
      }
      
      function ndjsonFormat() {
        var rs = dat.createReadStream({format: 'ndjson'})
        rs.pipe(ndjson.parse()).pipe(concat(function (json) {
          t.equals(json.length, 3, 'ndjson length')
          t.equals(json[0].a, 1, 'ndjson first row data')
          t.equals(Object.keys(json[0]).length, 3, 'ndjson first row keys')
          sseFormat()
        }))
      }
      
      function sseFormat() {
        var rs = dat.createReadStream({format: 'sse'})
        rs.pipe(concat(function (data) {
          var rows = data.split('\n\n')
          t.equals(rows.length, 4, 'sse length')
          var row = rows[0].split('event: data\ndata: ')
          t.equals(row.length, 2, 'sse header')
          var json = {}
          try { json = JSON.parse(row[1]) } catch(e) { t.fail(e.message)}
          t.equals(json.a, 1, 'sse first row data')
          t.equals(Object.keys(json).length, 3, 'sse first row keys')
          done()
        }))
      }
      
    })
  })
}

module.exports.createVersionStream = function(test, common) {
  test('createVersionStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put("foo", {"baz": "bar"}, function(err, doc) {
        t.false(err)
        var ver1 = doc.version
        doc.pizza = 'taco'
        dat.put(doc, function(err, doc) {
          t.false(err)
          // put some data before and after to make sure they dont get returned too
          dat.put("abc", {'bar': 'baz'}, function(err) {
            t.false(err)
            dat.put("xyz", {'bar': 'baz'}, function(err) {
              t.false(err)
              readVersions()
            })
          })
        })
      })
      
      function readVersions() {
        dat.createVersionStream('foo').pipe(concat(function(versions) {
          t.equal(versions.length, 2, '2 versions')
          var v1 = versions[0] || {version: ""}
          var v2 = versions[1] || {version: ""}
          t.equal(v1.version, 1)
          t.equal(v2.version, 2)
          t.equal(v1.pizza, null, 'version 1')
          t.equal(v2.pizza, 'taco', 'version 2')
          setImmediate(done)
        }))
      }
    })
  })
}


module.exports.all = function (test, common) {
  module.exports.readStreamBuff(test, common)
  module.exports.readStreamBuffPrimaryKey(test, common)
  module.exports.readStreamCsvPrimaryKey(test, common)
  module.exports.readStreamNdjPrimaryKey(test, common)
  module.exports.getChanges(test, common)
  module.exports.changesStream(test, common)
  module.exports.changesStreamTail(test, common)
  module.exports.changesStreamTailNum(test, common)
  module.exports.createReadStream(test, common)
  module.exports.createReadStreamStartEndKeys(test, common)
  module.exports.createReadStreamFormats(test, common)
  module.exports.createVersionStream(test, common)
}
