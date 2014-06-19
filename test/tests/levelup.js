// tests for levelup API compatibility

var path = require('path')
var concat = require('concat-stream')

module.exports.putGet = function(test, common) {
  test('.put + .get', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        dat.get('foo', function(err, data) {
          t.notOk(err, 'no err')
          t.equal(data.bar, "baz")
          setImmediate(done)
        })
      })
    })
  })
}

module.exports.del = function(test, common) {
  test('.del', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        dat.del('foo', function(err, data) {
          t.notOk(err, 'no err')
          setImmediate(done)
        })
      })
    })
  })
}

module.exports.createReadStream = function(test, common) {
  test('.createReadStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.createReadStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.ok(rows[0].key, '.key')
          t.ok(rows[0].value, '.value')
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.readStream = function(test, common) {
  test('.readStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.readStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.ok(rows[0].key, '.key')
          t.ok(rows[0].value, '.value')
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.createValueStream = function(test, common) {
  test('.createValueStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.createValueStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.equal(rows[0].bar, 'baz', 'baz')
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.valueStream = function(test, common) {
  test('.valueStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.valueStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.equal(rows[0].bar, 'baz', 'baz')
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.createKeyStream = function(test, common) {
  test('.createKeyStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.createKeyStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 key')
          t.equal(rows[0].key, 'foo')
          t.equal(rows[0].version, 1)
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.keyStream = function(test, common) {
  test('.keyStream', function(t) {
    common.getDat(t, function(dat, done) {
      dat.put('foo', {"bar": "baz"}, function(err, doc) {
        if (err) throw err
        var rs = dat.keyStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 key')
          t.equal(rows[0].key, 'foo')
          t.equal(rows[0].version, 1)
          setImmediate(done)
        }))
      })
    })
  })
}

module.exports.createWriteStream = function(test, common) {
  test('.createWriteStream', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({quiet: true})
    
      ws.on('end', function() {
        var rs = dat.keyStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 key')
          t.equal(rows[0].key, 'foo')
          t.equal(rows[0].version, 1)
          setImmediate(done)
        }))
      })
    
      ws.write({"key": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
}

module.exports.writeStream = function(test, common) {
  test('.writeStream', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.writeStream()
    
      ws.on('end', function() {
        var rs = dat.keyStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 key')
          t.equal(rows[0].key, 'foo')
          t.equal(rows[0].version, 1)
          setImmediate(done)
        }))
      })
    
      ws.write({"key": "foo", "b": "bar", "c": "hello"})
      ws.end()
    })
  })
}

module.exports.isOpen = function(test, common) {
  test('.isOpen', function(t) {
    common.getDat(t, function(dat, done) {
      var state = dat.isOpen()
      t.equal(state, true, 'open')
      done()
    })
  })
}

module.exports.isClosed = function(test, common) {
  test('.isClosed', function(t) {
    common.getDat(t, function(dat, done) {
      var state = dat.isClosed()
      t.equal(state, false, 'is not closed')
      done()
    })
  })
}



module.exports.all = function (test, common) {
  module.exports.putGet(test, common)
  module.exports.del(test, common)
  module.exports.createReadStream(test, common)
  module.exports.readStream(test, common)
  module.exports.createValueStream(test, common)
  module.exports.valueStream(test, common)
  module.exports.createKeyStream(test, common)
  module.exports.keyStream(test, common)
  module.exports.createWriteStream(test, common)
  module.exports.writeStream(test, common)
  module.exports.isOpen(test, common)
  module.exports.isClosed(test, common)
  // module.exports.batch(test, common)
}
