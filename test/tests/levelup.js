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
        var rs = dat.readStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.ok(rows[0], '.key')
          t.ok(rows[0], '.value')
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
        var rs = dat.readStream()
        rs.pipe(concat(function(rows) {
          t.equal(rows.length, 1, '1 row')
          t.ok(rows[0], '.key')
          t.ok(rows[0], '.value')
          setImmediate(done)
        }))
      })
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
  // module.exports.createKeyStream(test, common)
  // module.exports.keyStream(test, common)
  // module.exports.createWriteStream(test, common)
  // module.exports.writeStream(test, common)
  // module.exports.isOpen(test, common)
  // module.exports.isClosed(test, common)
  // module.exports.batch(test, common)
}
