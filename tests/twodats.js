var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var tmp = require('os').tmpdir()
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var dat = path.resolve(__dirname + '/../cli.js')

module.exports = function (cb) {
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

  cb(dat1, dat2, csvs)
}
