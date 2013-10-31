var path = require('path')
var os = require('os')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var test = require('tape')
var bops = require('bops')
var concat = require('concat-stream')
var mbstream = require('multibuffer-stream')
var buff = require('multibuffer')
var jsonbuff = require(path.join(__dirname, '..', 'lib', 'json-buff.js'))
var tmp = os.tmpdir()

// not a real test -- just resets any existing DB
test('setup', function(t) {
  destroy(tmp, function(err) {
    t.false(err, 'no err')
    destroy(path.join(tmp, 'dat2'), function(err) {
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

test('.put json', function(t) {
  getDat(t, function(dat, done) {
    dat.storage.put({"foo": "bar"}, function(err) {
      if (err) throw err
      var cat = dat.storage.currentData()
    
      cat.pipe(concat(function(data) {
        t.equal(data.length, 1)
        t.equal(data[0].foo, "bar")
        done()
      }))
    })
  })
})

test('.put buff', function(t) {
  getDat(t, function(dat, done) {
    var row = buff.pack([bops.from('bar')])
    
    dat.storage.put(row, {columns: ['foo']}, function(err) {
      if (err) throw err
      var cat = dat.storage.currentData()
    
      cat.pipe(concat(function(data) {
        t.equal(data.length, 1)
        t.equal(data[0].foo, "bar")
        done()
      }))
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
    
    var ws = dat.createWriteStream({ columns: ['foo'] })
    
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
    
    var ws = dat.createWriteStream({ columns: ['a', 'b'] })
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
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

test('currentData returns buff rows in same order they went in', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ columns: ['num'] })
    var nums = []
    
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        var results = data.map(function(r) { return +r.num })
        t.equals(JSON.stringify(nums), JSON.stringify(results), 'order matches')
        done()
      }))
    })
    
    var packStream = mbstream.packStream()
    packStream.pipe(ws)
    
    // create a bunch of single cell buff rows with incrementing integers in them
    for (var i = 0; i < 1000; i++) {
      packStream.write(buff.pack([bops.from(i + '')]))
      nums.push(i)
    }
    
    packStream.end()
  })
})

test('currentData returns buff rows in same order they went in w/ custom primary key', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ columns: ['num'], primary: 'num' })
    var nums = []
    
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        var results = data.map(function(r) { return r.num + '\xff' })
        t.equals(JSON.stringify(nums), JSON.stringify(results), 'order matches')
        done()
      }))
    })
    
    var packStream = mbstream.packStream()
    packStream.pipe(ws)
    
    // create a bunch of single cell buff rows with incrementing integers in them
    for (var i = 0; i < 1000; i++) {
      packStream.write(buff.pack([bops.from(i + '')]))
      nums.push(i + '\xff')
    }
    
    // sort lexicographically
    nums.sort()
    
    packStream.end()
  })
})

test('currentData returns csv rows in same order they went in w/ custom primary key', function(t) {
  // lexicographic means longer strings come first
  var expected = ['100', '10', '1']
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ csv: true, primary: 'a' })
    var nums = []
    
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        var results = data.map(function(r) { return r._id })
        t.equals(JSON.stringify(results), JSON.stringify(expected), 'order matches')
        done()
      }))
    })
    
    ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1'))
    ws.end()
  })
})

test('currentData returns ndjson rows in same order they went in w/ custom primary key', function(t) {
  // lexicographic means longer strings come first
  var expected = ['100', '10', '1']
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ json: true, primary: 'a' })
    var nums = []
    
    ws.on('close', function() {
      dat.storage.currentData().pipe(concat(function(data) {
        var results = data.map(function(r) { return r._id })
        t.equals(JSON.stringify(results), JSON.stringify(expected), 'order matches')
        done()
      }))
    })
    
    ws.write(bops.from(JSON.stringify({"a": "1", "b": "foo"}) + os.EOL))
    ws.write(bops.from(JSON.stringify({"a": "10", "b": "foo"}) + os.EOL))
    ws.write(bops.from(JSON.stringify({"a": "100", "b": "foo"})))
    ws.end()
  })
})

test('getSequences', function(t) {
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ csv: true })
    
    ws.on('close', function() {
      dat.storage.getSequences({include_data: true}).pipe(concat(function(data) {
        var seqs = data.map(function(r) { return r.seq })
        t.equal(JSON.stringify(seqs), JSON.stringify([1,2,3,4,5]) , 'ordered sequences 1 - 5 exist')
        t.equal(!!data[0].data, true)
        done()
      }))
    })
    
    ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1'))
    ws.end()
  })
})

test('pull replication', function(t) {
  var expected = ["1", "2"]
  var datTargetPath = path.join(tmp, 'dat2')
  getDat(t, function(dat, done) {
    var ws = dat.createWriteStream({ csv: true })
    var nums = []
    
    ws.on('close', function() {
      dat.serve(function(err, msg) {
        if (err) throw err
        var dat2 = new Dat(datTargetPath)
        dat2.init(function(err, msg) {
          if (err) throw err
          dat2.pull(function(err) {
            if (err) throw err
            dat2.storage.currentData().pipe(concat(function(data) {
              var results = data.map(function(r) { return r.a })
              t.equals(JSON.stringify(results), JSON.stringify(expected), 'replica matches')
              dat.close() // stops http server
              dat2.destroy(function(err) {
                t.false(err, 'no err')
                done()
              })
            }))
          })
        })
      })
    })
    
    ws.write(bops.from('a\n1\n2'))
    ws.end()
  })
})

test('buff <-> json', function(t) {
  var test = {'hello': 'world', 'foo': {'bar': '[baz]', 'pizza': [1,2,3]}}
  var columns = Object.keys(test)
  
  var encoded = jsonbuff.encode(test)
  var decoded = jsonbuff.decode(columns, encoded)
  
  t.equal(JSON.stringify(test), JSON.stringify(decoded), 'encoded/decoded matches')
  t.end()
})

function getDat(t, cb) {
  var dat = new Dat(tmp)
  dat.init(function(err, msg) {
    if (err) throw err
    cb(dat, done)
  })  
  
  function done() {
    dat.destroy(function(err) {
      if (err) throw err
      t.end()
    })
  }
}

function destroy(datDir, cb) {
  var dat = new Dat(datDir)
  dat.init(function(err, msg) {
    if (err) return cb(err)
    dat.level()
    dat.destroy(function(err) {
      cb(err)
    })
  })
}