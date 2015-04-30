var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var tmp = require('os').tmpdir()
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var dat = path.resolve(__dirname + '/../../cli.js')

module.exports = {
  onedat: onedat,
  twodats: twodats,
  conflict: conflict,
  randomTmpDir: randomTmpDir
}

function onedat (datPath) {
  test('init a dat', function (t) {
    rimraf.sync(datPath)
    mkdirp.sync(datPath)
    var st = spawn(t, dat + ' init', {cwd: datPath})
    st.stderr.match(/Initialized a new dat/)
    st.stdout.empty()
    st.end()
  })
}

function twodats (dat1, dat2) {
  onedat(dat1)
  onedat(dat2)
}

function conflict (dat1, dat2, csvs) {
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
}

function randomTmpDir () {
  var id = 'dat-' + Math.floor(Math.random() * 1000000)
  var dat = path.join(tmp, id)
  rimraf.sync(dat)
  mkdirp.sync(dat)
  return dat
}
