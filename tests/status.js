var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')

var dat1 = path.join(tmp, 'dat-status-1')
var dat2 = path.join(tmp, 'dat-status-2')

helpers.twodats(dat1, dat2)

test('status: dat1 status', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/This dat is empty/)
  st.end()
})

helpers.conflict(dat1, dat2, 'status-test')

test('status: dat1 status with multiple forks', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/Current version is/)
  st.end()
})

test('status: dat1 status as json', function (t) {
  var st = spawn(t, dat + ' status --json', {cwd: dat1})
  st.stdout.match(function (output) {
    try {
      var json = JSON.parse(output)
      return json.version.length === 64 // 32bit hash 2 in hex (64)
    } catch (e) {
      return false
    }
  })
  st.stderr.empty()
  st.end()
})
