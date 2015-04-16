var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var tmp = require('os').tmpdir()
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
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

rimraf.sync(dat1)
rimraf.sync(dat2)
mkdirp.sync(dat1)
mkdirp.sync(dat2)

// 1 -(a.csv)-hello ----(c.csv)--- HELLO
//                  |
//                  | (pull)
//                  |
// 2                 ---(b.csv)--- Hello

test('dat1 init', function (t) {
  var st = spawn(t, dat + ' init', {cwd: dat1})
  st.stderr.match(/Initialized a new dat/)
  st.stdout.empty()
  st.end()
})

test('dat2 init', function (t) {
  var st = spawn(t, dat + ' init', {cwd: dat2})
  st.stderr.match(/Initialized a new dat/)
  st.stdout.empty()
  st.end()
})

test('dat1 add', function (t) {
  var st = spawn(t, dat + ' add ' + csvs.a, {cwd: dat2})
  st.stderr.match(/Done adding data/)
  st.stdout.empty()
  st.end()
})

test('dat2 pull dat1', function (t) {
  var st = spawn(t, dat + ' pull ' + dat1, {cwd: dat2})
  st.stderr.empty()
  st.stdout.empty()
  st.end()
})

test('dat2 add b', function (t) {
  var st = spawn(t, dat + ' add ' + csvs.b, {cwd: dat2})
  st.stderr.match(/Done adding data/)
  st.stdout.empty()
  st.end()
})

test('dat1 add c', function (t) {
  var st = spawn(t, dat + ' add ' + csvs.c, {cwd: dat1})
  st.stderr.match(/Done adding data/)
  st.stdout.empty()
  st.end()
})

test('dat1 pull dat2', function (t) {
  var st = spawn(t, dat + ' pull ' + dat2, {cwd: dat1})
  st.stderr.empty()
  st.stdout.empty()
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
  var merge = spawn(t, dat + ' merge ' + hashes.join(' '), {cwd: dat1})
  
  diff.stdout.stream
    .pipe(through.obj(function (obj, enc, next) {
      next(null, obj.versions[0])
    }))
    .pipe(merge.stdin)
  
  diff.stderr.empty()
  diff.end()
    
  merge.stderr.empty()
  merge.stdout.empty()
  merge.end()
})
