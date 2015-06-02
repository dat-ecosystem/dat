var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var tmp = require('os').tmpdir()
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var dat = path.resolve(__dirname + '/../../cli.js')

var csvs = {
  a: path.resolve(__dirname + '/../fixtures/a.csv'),
  b: path.resolve(__dirname + '/../fixtures/b.csv'),
  c: path.resolve(__dirname + '/../fixtures/c.csv')
}

module.exports = {
  onedat: onedat,
  twodats: twodats,
  conflict: conflict,
  randomTmpDir: randomTmpDir
}

function onedat (datPath) {
  test('helpers: init a dat', function (t) {
    cleanup()
    var st = spawn(t, dat + ' init', {cwd: datPath})
    st.stderr.match(/Initialized a new dat/, datPath)
    st.stdout.empty()
    st.end()
  })

  function cleanup () {
    rimraf.sync(datPath)
    mkdirp.sync(datPath)
  }

  return cleanup
}

function twodats (dat1, dat2) {
  onedat(dat1)
  onedat(dat2)
}

function conflict (dat1, dat2, dataset, cb) {
  // creates conflict where:
  // dat1 does max -> MAX
  // dat2 does max -> Max
  // dat1 pulls dat2, has 2 heads
  // if cb is supplied will also retrieve heads

  test('helpers: dat1 import', function (t) {
    var st = spawn(t, dat + ' import -d ' + dataset + ' ' + csvs.a, {cwd: dat2})
    st.stderr.match(/Done importing data/)
    st.stdout.empty()
    st.end()
  })

  test('helpers: dat2 pull dat1', function (t) {
    // uses --bin since dat is not in the PATH necessarily when running tests
    var st = spawn(t, dat + ' pull ' + dat1 + ' --bin=' + dat, {cwd: dat2})
    st.stderr.empty()
    st.stdout.empty()
    st.end()
  })

  test('helpers: dat2 import b', function (t) {
    var st = spawn(t, dat + ' import -d ' + dataset + ' ' + csvs.b, {cwd: dat2})
    st.stderr.match(/Done importing data/)
    st.stdout.empty()
    st.end()
  })

  test('helpers: dat1 import c', function (t) {
    var st = spawn(t, dat + ' import -d ' + dataset + ' ' + csvs.c, {cwd: dat1})
    st.stderr.match(/Done importing data/)
    st.stdout.empty()
    st.end()
  })

  test('helpers: dat1 pull dat2', function (t) {
    var st = spawn(t, dat + ' pull ' + dat2 + ' --bin=' + dat, {cwd: dat1})
    st.stderr.empty()
    st.stdout.empty()
    st.end()
  })

  if (!cb) return
  var hashes

  test('helpers: get forks', function (t) {
    var st = spawn(t, dat + ' forks', {cwd: dat1})
    st.stderr.empty()
    st.stdout.match(function match (output) {
      var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
      if (ok) hashes = output.trim().split('\n')
      return ok
    })
    st.end()
  })

  test('helpers: get status', function (t) {
    var statusJson
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
      var forks = {remotes: []}
      hashes.forEach(function (hash) {
        if (hash === statusJson.version) forks.mine = hash
        else forks.remotes.push(hash)
      })
      t.end()
      cb(forks)
    })
  })
}

function randomTmpDir () {
  var id = 'dat-' + Math.floor(Math.random() * 1000000)
  var dat = path.join(tmp, id)
  rimraf.sync(dat)
  mkdirp.sync(dat)
  return dat
}
