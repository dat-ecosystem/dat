var jsonBuffStream = require('json-multibuffer-stream')
var concat = require('concat-stream')
var buff = require('multibuffer')
var bops = require('bops')

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


module.exports.all = function (test, common) {
  module.exports.buffToJson(test, common)
  module.exports.putJson(test, common)
  module.exports.multiplePutJson(test, common)
  module.exports.putBuff(test, common)
}