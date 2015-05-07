var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var through = require('through2')
var helpers = require('./helpers/index.js')
var tmp = require('os').tmpdir()
var through = require('through2')

var dat = path.resolve(__dirname + '/../cli.js')
var hashes, diff

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

test('dat1 diff', function (t) {
  var st = spawn(t, dat + ' diff ' + hashes.join(' '), {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      diff = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (diff.versions[0].value.name === 'Max' && diff.versions[1].value.name === 'MAX') return true
  })
  st.end()
})

test('dat1 merge', function (t) {
  var diff = spawn(t, dat + ' diff ' + hashes.join(' '), {cwd: dat1})
  var merge = spawn(t, dat + ' merge --live' + hashes.join(' '), {cwd: dat1})

  diff.stdout.stream
    .pipe(through.obj(function (obj, enc, next) {
      obj = JSON.parse(obj.toString())
      next(null, obj.versions[0].toString())
    }))
    .pipe(merge.stdin)

  diff.stderr.empty()
  merge.stderr.match(/Merged/)
  merge.stdout.empty()
  t.end()
})

test('verify merge version', function (t) {
  var st = spawn(t, dat + ' cat ', {cwd: dat1})

  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      output = JSON.parse(output)
      return output.value.name === 'max'
    } catch (e) {
      return false
    }
  })

  st.end()
})
