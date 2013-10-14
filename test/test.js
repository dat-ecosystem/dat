var path = require('path')
var os = require('os')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var test = require('tape')
var concat = require('concat-stream')
var jsonbuff = require('../lib/json-buff.js')
var tmp = os.tmpdir()

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

test('creating single row with write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream()
    ws.write('foo')
    ws.end()
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        done()
      }))
    })
  })
})

test('piping a csv into a write stream', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({csv: true})
    ws.write('a,b,c\n1,2,3')
    ws.end()
    ws.on('close', function() {
      var cat = dat.storage.currentData()
      cat.pipe(concat(function(data) {
        done()
      }))
    })
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
