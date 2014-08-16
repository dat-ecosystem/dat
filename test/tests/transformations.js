var through = require('through2')
var concat = require('concat-stream')

var uppercase = function() {
  return through.obj(function(row, enc, cb) {
    row.value = row.value.toUpperCase()
    cb(null, row)
  })
}

module.exports.getTransform = function(test, common) {
  test('.get transforms', function(t) {
    common.getDat(t, {transformations:{get:uppercase}}, function(dat, done) {
      dat.put({key:'key', value:'test'}, function() {
        dat.get('key', function(err, doc) {
          t.equal(doc.value, 'TEST')
          done()
        })
      })
    })
  })
}

module.exports.putTransform = function(test, common) {
  test('.put transforms', function(t) {
    common.getDat(t, {transformations:{put:uppercase}}, function(dat, done) {
      dat.put({key:'key', value:'test'}, function() {
        dat.get('key', function(err, doc) {
          t.equal(doc.value, 'TEST')
          done()
        })
      })
    })
  })
}

module.exports.readStreamTransform = function(test, common) {
  test('.createReadStream transforms', function(t) {
    common.getDat(t, {transformations:{get:uppercase}}, function(dat, done) {
      dat.put({key:'key1', value:'a'}, function() {
        dat.put({key:'key2', value:'b'}, function() {
          dat.createReadStream().pipe(concat(function(list) {
            t.equal(list[0].value, 'A')
            t.equal(list[1].value, 'B')
            done()
          }))
        })
      })
    })
  })
}

module.exports.writeStreamTransform = function(test, common) {
  test('.writeReadStream transforms', function(t) {
    common.getDat(t, {transformations:{put:uppercase}}, function(dat, done) {
      var ws = dat.createWriteStream()

      ws.on('finish', function() {
        dat.createReadStream().pipe(concat(function(list) {
          t.equal(list[0].value, 'A')
          t.equal(list[1].value, 'B')
          done()
        }))
      })

      ws.write({key:'key1', value:'a'})
      ws.write({key:'key2', value:'b'})
      ws.end()
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.getTransform(test, common)
  module.exports.putTransform(test, common)
  module.exports.readStreamTransform(test, common)
  module.exports.writeStreamTransform(test, common)
}