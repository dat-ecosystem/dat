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

test('export: dat import csv', function (t) {
  var st = spawn(t, dat + ' import ' + csvfile + ' -d export-test --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('export: dat export to file', function (t) {
  var st = spawn(t, dat + ' export -d export-test > ' + exportfile, {cwd: dat1})
  st.stdout.empty()
  st.stderr.empty()
  st.end()
})

test('export: dat export output matches original file', function (t) {
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

test('export: dat export with limit', function (t) {
  var st = spawn(t, dat + ' export --limit=5 --dataset=export-test', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length > 6) return false
    if (lines.length === 6) {
      var line = JSON.parse(lines[4]) // 5th line is empty string due to splittage
      if (line.id === 'ak11246293') {
        return line.latitude === '60.0366'
      }
      return false
    }
  })
  st.end()
})

test('export: dat export with limit and csv', function (t) {
  var st = spawn(t, dat + ' export --limit=5 --dataset=export-test --format=csv', {cwd: dat1})
  st.stderr.empty()
  var ok = false
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length > 6) return ok
    if (lines.length === 6) {
      ok = lines[5] === '' // last is empty due to splittage
    }
  })
  st.end()
})

test('export: dat export with limit and csv without dataset errors', function (t) {
  var st = spawn(t, dat + ' export --limit=5 --format=csv', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('export: dat export with range options without dataset errors', function (t) {
  var st = spawn(t, dat + ' export --lt=ak11246291', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('export: dat export with lt', function (t) {
  var st = spawn(t, dat + ' export --dataset=export-test --lt=ak11246291', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length === 4) {
      return (
        (JSON.parse(lines[0]).id === 'ak11246285') &&
        (JSON.parse(lines[1]).id === 'ak11246287') &&
        (JSON.parse(lines[2]).id === 'ak11246289')
      )
    }
    return false
  })
  st.end()
})

test('export: dat export with lt and limit options', function (t) {
  var st = spawn(t, dat + ' export --dataset=export-test --lt=ak11246291 --limit=1', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length === 2) {
      return (JSON.parse(lines[0]).id === 'ak11246285')
    }
    return false
  })
  st.end()
})

test('export: dat export without dataset errors', function (t) {
  var st = spawn(t, dat + ' export', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

var forks, row

var dat2 = path.join(tmp, 'dat-2')
var dat3 = path.join(tmp, 'dat-1')

helpers.twodats(dat2, dat3)
helpers.conflict(dat2, dat3, 'max', function (conflictForks) {
  forks = conflictForks
})

test('export: dat export with checkout', function (t) {
  var st = spawn(t, dat + ' export --dataset=max --checkout=' + forks.mine, {cwd: dat2})
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

test('export: dat export with checkout remote fork', function (t) {
  var st = spawn(t, dat + ' export --dataset=max --checkout=' + forks.remotes[0], {cwd: dat2})
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

test('export: dat export with checkout remote fork abbr', function (t) {
  var st = spawn(t, dat + ' export -d max -c ' + forks.remotes[0], {cwd: dat2})
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

test('export: dat write', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' write test-file.txt -d max -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Storing test-file\.txt/)
  st.end()
})

test('export: dat export with checkout after write', function (t) {
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
