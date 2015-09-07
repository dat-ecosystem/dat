var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')

var dat1 = path.join(tmp, 'dat-status-1')
var dat2 = path.join(tmp, 'dat-status-2')

helpers.twodats(dat1, dat2)

test('status-log: dat1 status', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/1 file/)
  st.end()
})

helpers.conflict(dat1, dat2, 'status-test')

test('status-log: dat1 status with multiple forks', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Current version is/)
  st.end()
})

test('status-log: dat1 status as json', function (t) {
  var st = spawn(t, dat + ' status --json', {cwd: dat1})
  st.stdout.match(function (output) {
    try {
      var json = JSON.parse(output)
      t.same(json.version.length, 64) // 32bit hash 2 in hex (64)
      t.same(json.datasets, 1) // files dataset doesn't count!
      return true
    } catch (e) {
      return false
    }
  })
  st.stderr.empty()
  st.end()
})

test('status-log: dat1 log', function (t) {
  var st = spawn(t, dat + ' log', {cwd: dat1})
  st.stdout.match(function (output) {
    if (output.split('Version:').length !== 5) return false
    if (output.split('Date:').length !== 5) return false
    return true
  })
  st.stderr.empty()
  st.end()
})

test('status-log: dat1 changes', function (t) {
  var st = spawn(t, dat + ' changes', {cwd: dat1})
  var lines = 0
  st.stdout.match(function (output) {
    var data = JSON.parse(output)
    if (lines === 0) {
      t.same(data.content, 'file')
      t.same(data.dataset, 'files')
      t.same(data.type, 'put')
      t.ok(data.key)
    } else {
      t.same(data.content, 'row')
      t.same(data.dataset, 'status-test')
      t.same(data.type, 'put')
      t.ok(data.key)
    }
    lines++
    return true
  })
  st.stderr.empty()
  st.end()
})

test('status-log: dat1 log json', function (t) {
  var st = spawn(t, dat + ' log --json', {cwd: dat1})
  st.stdout.match(function (output) {
    try {
      var lines = output.split('\n')
      lines.forEach(function (l) {
        if (!l) return // empty line
        JSON.parse(l)
      })
      return true
    } catch (e) {
      return false
    }
  })
  st.stderr.empty()
  st.end()
})
