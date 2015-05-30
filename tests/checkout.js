var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')
var hashes, statusJson

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

var dat1 = path.join(tmp, 'dat-checkout-1')
var dat2 = path.join(tmp, 'dat-checkout-2')
var dataset = 'checkout-test-dataset'

helpers.twodats(dat1, dat2)
helpers.conflict(dat1, dat2, dataset, csvs)

test('dat1 forks', function (t) {
  var st = spawn(t, dat + ' forks', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
    if (ok) hashes = output.split('\n').slice(0, 2)
    return ok
  })
  st.end()
})

test('dat1 status returns local version', function (t) {
  var stat = spawn(t, dat + ' status --json', {cwd: dat1, end: false})
  stat.stderr.empty()
  stat.stdout.match(function match (output) {
    try {
      statusJson = JSON.parse(output)
    } catch (e) {
      statusJson = false
    }
    if (statusJson && statusJson.version) return true
    else return false
  })
  stat.end(function () {
    t.end()
  })
})

test('dat1 gets proper export', function (t) {
  // determine which has is ours and which came from dat2, then checkout to the remote one
  var remoteHash
  if (hashes[0] === statusJson.version) remoteHash = hashes[1]
  else remoteHash = hashes[0]

  var checkout = spawn(t, dat + ' checkout ' + remoteHash, {cwd: dat1, end: false})
  checkout.stderr.match(new RegExp('Current version is now ' + remoteHash))
  checkout.stdout.empty()
  checkout.end(function () {
    var exp = spawn(t, dat + ' export -d ' + dataset, {cwd: dat1})
    exp.stdout.match(/Max/)
    exp.stderr.empty()
    exp.end()
  })
})
