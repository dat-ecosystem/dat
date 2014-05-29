// tests for levelup API compatibility

var path = require('path')
var concat = require('concat-stream')

module.exports.put = function(test, common) {
  test('.put', function(t) {
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

module.exports.all = function (test, common) {
  module.exports.put(test, common)
  // module.exports.get(test, common)
  // module.exports.del(test, common)
  // module.exports.createReadStream(test, common)
  // module.exports.readStream(test, common)
  // module.exports.createValueStream(test, common)
  // module.exports.valueStream(test, common)
  // module.exports.createKeyStream(test, common)
  // module.exports.keyStream(test, common)
  // module.exports.createWriteStream(test, common)
  // module.exports.writeStream(test, common)
  // module.exports.isOpen(test, common)
  // module.exports.isClosed(test, common)
  // module.exports.batch(test, common)
}
