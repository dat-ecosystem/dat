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
    var decoded = jsonBuffStream.decode(columns, encoded)
  
    t.equal(JSON.stringify(test), JSON.stringify(decoded), 'encoded/decoded matches')
    t.end()
  })
}

module.exports.rowKeys = function(test, common) {
  test('storage.rowKeys returns correctly formatted keys', function(t) {
    var sep = '\xff'
    
    var keys = {
      seq:  's',
      data: 'd',
      rev:  'r'
    }
    
    var a = docUtils.rowKeys(keys, sep, 'foo', '1-abc', '1')
    t.deepEqual(a, { row: 'ÿdÿfooÿrÿ01-abcÿsÿ01', seq: 'ÿsÿ01' })
    
    var b = docUtils.rowKeys(keys, sep, 'foo', '1-abc')
    t.deepEqual(b, { row: 'ÿdÿfooÿrÿ01-abc'})
    
    t.end()
  })
}

module.exports.putJson = function(test, common) {
  test('.put json', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put({"foo": "bar"}, function(err) {
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

module.exports.schemaVersion = function(test, common) {
  test('schema version should increment when schema changes', function(t) {
    common.getDat(t, function(dat, done) {
      t.equal(dat.meta.json.schemaVersion, 0, 'schemaVersion 0')
      dat.put({"foo": "bar"}, function(err) {
        if (err) throw err
        t.equal(dat.meta.json.schemaVersion, 1, 'schemaVersion 1')
        dat.put({"foo": "bar", "taco": "pizza"}, function(err) {
          if (err) throw err
          var cat = dat.schemas.createReadStream()
          t.equal(dat.meta.json.schemaVersion, 2, 'schemaVersion 2')
    
          cat.pipe(concat(function(data) {
            t.equal(data.length, 2, '2 schema versions')
            t.equal(data[0].version, 2, 'latest version is 2')
            t.equal(data[1].version, 1, 'older version is 1')
            done()
          }))
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.buffToJson(test, common)
  module.exports.rowKeys(test, common)
  module.exports.putJson(test, common)
  module.exports.multiplePutJson(test, common)
  module.exports.putBuff(test, common)
  module.exports.schemaVersion(test, common)
}