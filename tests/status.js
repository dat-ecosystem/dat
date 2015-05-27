var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')

var dat1 = path.join(tmp, 'dat-1')
var dat2 = path.join(tmp, 'dat-2')

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

helpers.twodats(dat1, dat2)

test('dat1 status', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Current version is/)
  st.end()
})

helpers.conflict(dat1, dat2, 'status-test', csvs)

test('dat1 status with multiple heads', function (t) {
  var st = spawn(t, dat + ' status', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Current version is/)
  st.end()
})

test('dat1 status as json', function (t) {
  var st = spawn(t, dat + ' status --log=json', {cwd: dat1})
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
