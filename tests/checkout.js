var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')
var hashes

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

var dat1 = path.join(tmp, 'dat-1')
var dat2 = path.join(tmp, 'dat-2')

helpers.twodats(dat1, dat2)
helpers.conflict(dat1, dat2, csvs)

test('dat1 heads', function (t) {
  var st = spawn(t, dat + ' heads', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
    if (ok) hashes = output.split('\n')
    return ok
  })
  st.end()
})

test('dat1 checkout gets proper cat', function (t) {
  var checkout = spawn(t, dat + ' checkout ' + hashes[0], {cwd: dat1})
  checkout.stdout.match(/Checked out to/)

  var cat = spawn(t, dat + ' cat', {cwd: dat1})
  cat.stdout.match(/Max/)
  checkout.stderr.empty()
  checkout.end()

  cat.stderr.empty()
  cat.end()
})
