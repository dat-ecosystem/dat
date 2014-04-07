var path = require('path')
var jsonBuffStream = require('json-multibuffer-stream')
var concat = require('concat-stream')
var buff = require('multibuffer')
var bops = require('bops')
var docUtils = require(path.join(__dirname, '..', '..', 'lib', 'document'))

module.exports.buffToJson = function(test, common) {
  test('buff <-> json', function(t) {
    var test = {'hello': 'world', 'foo': {'bar': '[baz]', 'pizza': [1,2,3]}}
    var columns = Object.keys(test)
  
    var encoded = jsonBuffStream.encode(test)
    var decoded = jsonBuffStream.decode(columns, encoded).decoded
    decoded.foo = JSON.parse(decoded.foo)
    t.deepEqual(test, decoded, 'encoded/decoded matches')
    t.end()
  })
}

module.exports.rowKeys = function(test, common) {
  test('rowKeys returns correctly formatted keys', function(t) {
    var sep = '\xff'
    
    var keys = {
      seq: 's',
      data: 'd',
      rev: 'r',
      cur: 'c'
    }
    
    var a = docUtils.rowKeys(keys, sep, 'foo', '1-abc', '4')
    t.deepEqual(a, { row: 'ÿdÿfooÿ01-abc', seq: 'ÿsÿ04', cur: "ÿcÿfoo" })
    
    t.end()
  })
}

module.exports.decodeKey = function(test, common) {
  test('decodeKey parses key format correctly', function(t) {
    var key = 'ÿdÿfooÿ01-abc'
    var obj = docUtils.decodeKey(key)
    var expected = {
      _id: 'foo',
      _rev: '1-abc'
    }
    t.deepEqual(obj, expected)
    t.end()
  })
}

module.exports.putJson = function(test, common) {
  test('.put json', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, function(err, doc) {
        if (err) throw err
        var cat = dat.createReadStream()
    
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].foo, "bar")
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.putJsonPrimary = function(test, common) {
  test('.put json w/ primary key option', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, {primary: 'foo'}, function(err, doc) {
        if (err) throw err
        dat.get('bar', function(err, data) {
          t.notOk(err, 'no err')
          t.equal(data.foo, "bar")
          setImmediate(done)
        })
      })
    })
  })
}

module.exports.updateJson = function(test, common) {
  test('.put and then update json', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"_id": "foo"}, function(err, doc) {
        if (err) throw err
        t.ok(doc._rev, 'should return doc w/ rev')
        dat.put({"_id": "foo"}, function(err, doc2) {
          t.ok(err, 'should err')
          t.notOk(doc2, "should not return data")
          dat.put(doc, function(err, doc3) {
            t.notOk(err, 'no err')
            t.equals(doc3._rev[0], '2', 'should be at rev 2')
            setImmediate(done)
          })
        })
      })
    })
  })
}

module.exports.multiplePutJson = function(test, common) {
  test('.put same json multiple times (random id generation)', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, function(err) {
        if (err) throw err
        dat.put({"foo": "bar"}, function(err) {
          if (err) throw err
          var cat = dat.createReadStream()
    
          cat.pipe(concat(function(data) {
            t.equal(data.length, 2)
            t.equal(data[0].foo, "bar")
            t.equal(data[1].foo, "bar")
            done()
          }))
        })
      })
    })
  })
}


module.exports.putBuff = function(test, common) {
  test('.put buff', function(t) {
    common.getDat(t, function(dat, done) {
      var row = buff.pack([bops.from('bar')])
    
      dat.put(row, {columns: ['foo']}, function(err) {
        if (err) throw err
        var cat = dat.createReadStream()
    
        cat.pipe(concat(function(data) {
          t.equal(data.length, 1)
          t.equal(data[0].foo, "bar")
          done()
        }))
      })
    })
  })
}

module.exports.deleteRow = function(test, common) {
  test('delete row', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, function(err, doc) {
        if (err) throw err
        dat.delete(doc._id, function(err) {
          t.false(err, 'should delete okay')
          dat.get(doc._id, function(err, doc) {
            t.true(err, 'doc should now be not found')
            t.false(doc, 'doc should be null')
            setTimeout(done, 10) // TODO WHY????
          })
        })
      })
    })
  })
}

module.exports.getAtRev = function(test, common) {
  test('get row at specific rev', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, function(err, doc) {
        if (err) throw err
        var rev1 = doc._rev
        doc.pizza = 'taco'
        dat.put(doc, function(err, doc) {
          t.false(err)
          if (!doc) doc = {}
          dat.get(doc._id, { rev: rev1 }, function(err, docAtRev) {
            t.false(err, 'no err')
            if (!docAtRev) docAtRev = {}
            t.equal(docAtRev.pizza, undefined, 'doc is version 1')
            setImmediate(done)
          })
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.buffToJson(test, common)
  module.exports.rowKeys(test, common)
  module.exports.decodeKey(test, common)
  module.exports.putJson(test, common)
  // module.exports.putJsonPrimary(test, common)
  module.exports.updateJson(test, common)
  module.exports.multiplePutJson(test, common)
  module.exports.putBuff(test, common)
  module.exports.deleteRow(test, common)
  module.exports.getAtRev(test, common)
}
