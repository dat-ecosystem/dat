var mbstream = require('multibuffer-stream')
var buff = require('multibuffer')
var bops = require('bops')
var concat = require('concat-stream')
var os = require('os')

module.exports.readStreamBuff = function(test, common) {
  test('readStream returns buff rows in same order they went in', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ columns: ['num'] })
      var nums = []
    
      ws.on('close', function() {
        dat.createReadStream().pipe(concat(function(data) {
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
}

module.exports.readStreamBuffPrimaryKey = function(test, common) {
  test('readStream returns buff rows in same order they went in w/ custom primary key', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ columns: ['num'], primary: 'num' })
      var nums = []
    
      ws.on('close', function() {
        dat.createReadStream().pipe(concat(function(data) {
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
}

module.exports.readStreamCsvPrimaryKey = function(test, common) {
  test('readStream returns csv rows in same order they went in w/ custom primary key', function(t) {
    // lexicographic means longer strings come first
    var expected = ['100', '10', '1']
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, primary: 'a' })
      var nums = []
    
      ws.on('close', function() {
        dat.createReadStream().pipe(concat(function(data) {
          var results = data.map(function(r) { return r._id })
          t.equals(JSON.stringify(results), JSON.stringify(expected), 'order matches')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1'))
      ws.end()
    })
  })
}

module.exports.readStreamNdjPrimaryKey = function(test, common) {
  test('readStream returns ndjson rows in same order they went in w/ custom primary key', function(t) {
    // lexicographic means longer strings come first
    var expected = ['100', '10', '1']
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ json: true, primary: 'a' })
      var nums = []
    
      ws.on('close', function() {
        dat.createReadStream().pipe(concat(function(data) {
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
}

module.exports.getSequences = function(test, common) {
  test('getSequences', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true })
    
      ws.on('close', function() {
        dat.createChangesStream({include_data: true}).pipe(concat(function(data) {
          var seqs = data.map(function(r) { return r.seq })
          t.equal(JSON.stringify(seqs), JSON.stringify([1,2,3,4,5]) , 'ordered sequences 1 - 5 exist')
          t.equal(!!data[0].data, true)
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1\n1,1,1\n1,1,1'))
      ws.end()
    })
  })
}

module.exports.createReadStream = function(test, common) {
  test('createReadStream', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true })
    
      ws.on('close', function() {
        var readStream = dat.createReadStream()
        readStream.pipe(concat(function(rows) {
          t.equal(rows.length, 5, '5 rows')
          done()
        }))
      })
    
      ws.write(bops.from('a,b,c\n10,1,1\n100,1,1\n1,1,1\n1,1,1\n1,1,1'))
      ws.end()
    })
  })
}

module.exports.createReadStreamStartEndKeys = function(test, common) {
  test('createReadStream w/ start + end keys', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, primary: 'a' })
    
      ws.on('close', function() {
        var readStream = dat.createReadStream({ start: '2', end: '4'})
        readStream.pipe(concat(function(rows) {
          t.equal(rows.length, 2, '2 rows')
          t.equal(rows[0].a, '2')
          t.equal(rows[1].a, '3')
          done()
        }))
      })
    
      ws.write(bops.from('a\n1\n2\n3\n4\n5'))
      ws.end()
    })
  })
}

module.exports.createReadStreamCSV = function(test, common) {
  test('createReadStream csv', function(t) {
    common.getDat(t, function(dat, done) {
      var ws = dat.createWriteStream({ csv: true, primary: 'a' })
    
      ws.on('close', function() {
        var readStream = dat.createReadStream({ csv: true })
        readStream.pipe(concat(function(data) {
          var rows = data.split('\n')
          t.equal(rows[0].split(',').length, 3)
          t.equal(rows[1].split(',').length, 3)
          t.equal(rows.length, 7)
          done()
        }))
      })
    
      ws.write(bops.from('a\n1\n2\n3\n4\n5'))
      ws.end()
    })
  })
}


module.exports.all = function (test, common) {
  module.exports.readStreamBuff(test, common)
  module.exports.readStreamBuffPrimaryKey(test, common)
  module.exports.readStreamCsvPrimaryKey(test, common)
  module.exports.readStreamNdjPrimaryKey(test, common)
  module.exports.getSequences(test, common)
  module.exports.createReadStream(test, common)
  module.exports.createReadStreamStartEndKeys(test, common)
  module.exports.createReadStreamCSV(test, common)
}
