var path = require('path')
var os = require('os')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var test = require('tape')
var bops = require('bops')
var concat = require('concat-stream')
var mbstream = require('multibuffer-stream')
var buff = require('multibuffer')
var jsonbuff = require('../lib/json-buff.js')
var tmp = os.tmpdir()

// not a real test -- just resets any existing DB
test('setup', function(t) {
  var dat = new Dat(tmp)
  dat.init(function(err, msg) {
    t.false(err, 'no err')
    dat.level()
    dat.destroy(function(err) {
      t.false(err, 'no err')
      t.end()
    })
  })
})

test('.paths', function(t) {
  var dat = new Dat(tmp)
  var paths = dat.paths()
  t.equal(paths.dat, path.join(tmp, '.dat'), 'dat path')
  t.equal(paths.level, path.join(tmp, '.dat', 'store.dat'), 'level path')
  t.end()
})

test('.init, .exists, .destroy', function(t) {
  var dat = new Dat(tmp)
  dat.exists(function(err, exists) {
    t.false(err, 'no err')
    t.false(exists, 'does not exist')
    dat.init(function(err, msg) {
      dat.exists(function(err, exists) {
        t.false(err, 'no err')
        t.true(exists, 'exists')
        dat.destroy(function(err) {
          t.false(err, 'no err')
          dat.exists(function(err, exists) {
            t.false(err, 'no err')
            t.false(exists, 'does not exist')
            t.end()
          })
        })
      })
    })
  })
})

test('.init in existing repo', function(t) {
  var dat = new Dat(tmp)
  dat.init(function(err, msg) {
    t.false(err, 'no err')
    dat.init(function(err, msg) {
      t.true(msg, msg)
      dat.destroy(function(err) {
        t.false(err, 'no err')
        t.end()
      })
    })
  })
})

test('piping a single ndjson object into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ json: true })
    ws.on('close', function() {
      var cat = dat.storage.currentData()
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

test('piping a single ndjson string into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ json: true })
    ws.on('close', function() {
      var cat = dat.storage.currentData()
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

test('piping multiple ndjson objects into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ json: true })
    ws.on('close', function() {
      var cat = dat.storage.currentData()
      cat.pipe(concat(function(data) {
        data.sort(function(a,b) { return a._seq > b._seq })
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

test('piping a single row of buff data with write stream', function(t) {
  var row = buff.pack([bops.from('bar')])
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ headers: ['foo'] })
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
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

test('piping multiple rows of buff data with write stream', function(t) {
  var row1 = buff.pack([bops.from('1'), bops.from('2')])
  var row2 = buff.pack([bops.from('3'), bops.from('4')])
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ headers: ['a', 'b'] })
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        data.sort(function(a,b) { return a._seq > b._seq })
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

test('piping a csv with 1 row into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ csv: true })
    ws.on('close', function() {
      var cat = dat.storage.currentData()
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

test('piping a csv with multiple rows into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ csv: true })
    ws.on('close', function() {
      var cat = dat.storage.currentData()
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

test('buff <-> json', function(t) {
  var test = {'hello': 'world', 'foo': {'bar': '[baz]', 'pizza': [1,2,3]}}
  var headers = Object.keys(test)
  var encoded = jsonbuff.encode(test)
  var decoded = jsonbuff.decode(headers, encoded)
  t.equal(JSON.stringify(test), JSON.stringify(decoded), 'encoded/decoded matches')
  t.end()
})

function getDat(t, cb) {
  var dat = new Dat(tmp)
  dat.init(function(err, msg) {
    t.false(err, 'no err')
    dat._storage({}, function(err, seq) {
      t.false(err, 'no err')
      cb(dat, done)
    })
  })  
  
  function done() {
    dat.destroy(function(err) {
      t.false(err, 'no err')
      t.end()
    })
  }
}
