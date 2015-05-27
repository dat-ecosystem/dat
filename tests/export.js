var os = require('os')
var path = require('path')
var test = require('tape')
var csv = require('csv-parser')
var spawn = require('tape-spawn')
var fs = require('fs')
var iterate = require('stream-iterate')
var sort = require('sort-stream')

var helpers = require('./helpers')
var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)

var csvfile = path.resolve(__dirname + '/fixtures/all_hour.csv')
var exportfile = path.join(dat1, 'out.csv')

test('dat import csv', function (t) {
  var st = spawn(t, dat + ' import ' + csvfile + ' -d test-ds --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('dat export to file', function (t) {
  var st = spawn(t, dat + ' export -d test-ds > ' + exportfile, {cwd: dat1})
  st.stdout.empty()
  st.stderr.empty()
  st.end()
})

test('dat export output matches original file', function (t) {
  t.plan(53)
  var sorter = sort(function (a, b) {
    return parseFloat(a.latitude) < parseFloat(b.longitude)
  })
  var original = fs.createReadStream(csvfile).pipe(csv()).pipe(sorter)
  var copied = fs.createReadStream(exportfile).pipe(csv()).pipe(sorter)

  var read = iterate(original)
  var read2 = iterate(copied)

  function loop () {
    read(function (err, line, next) {
      t.ifError(err)
      read2(function (err, line2, next2) {
        t.ifError(err)
        if (!line || !line2) return
        t.deepEquals(line, line2)
        next()
        next2()
        loop()
      })
    })
  }

  loop()

})

var hashes, row

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

var dat2 = path.join(tmp, 'dat-2')
var dat3 = path.join(tmp, 'dat-1')

helpers.twodats(dat2, dat3)
helpers.conflict(dat2, dat3, 'max', csvs)

test('dat heads', function (t) {
  var st = spawn(t, dat + ' heads', {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
    if (ok) hashes = output.split('\n')
    return ok
  })
  st.end()
})

test('dat export with checkout', function (t) {
  var st = spawn(t, dat + ' export --dataset=max --checkout=' + hashes[0], {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      row = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (row.name === 'MAX') return true
  })
  st.end()
})

test('dat export with checkout hash 1', function (t) {
  var st = spawn(t, dat + ' export --dataset=max --checkout=' + hashes[1], {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      row = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (row.name === 'Max') return true
  })
  st.end()
})

test('dat export with checkout hash 1 abbr', function (t) {
  var st = spawn(t, dat + ' export -d max -c ' + hashes[1], {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      row = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (row.name === 'Max') return true
  })
  st.end()
})

// export after write file

test('dat write', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' write test-file.txt -d max -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done writing binary data/)
  st.end()
})

test('dat export with checkout', function (t) {
  var st = spawn(t, dat + ' export -d max', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      row = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (row.name === 'Max') return true
  })
  st.end()
})
