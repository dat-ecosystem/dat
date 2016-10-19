var fs = require('fs')
var os = require('os')
var mkdirp = require('mkdirp')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

var fixturesStaticLink

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

cleanDat() // make sure we start fresh

test('prints link (live)', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('prints link (static)', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    fixturesStaticLink = matches
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('static link consistent', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    t.ok((matches = fixturesStaticLink), 'link matches')
    st.kill()
    cleanDat()
    return true
  }, 'dat link printed')
  st.end()
})

test('share resume uses same key', function (t) {
  // cmd: dat tests/fixtures (twice)
  var key = null
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    key = matches
    st.kill()
    spawnAgain()
    return true
  })

  function spawnAgain () {
    var st = spawn(t, dat + ' ' + fixtures)
    st.stdout.match(function (output) {
      var matches = matchDatLink(output)
      if (!matches) return false
      t.equals(key, matches, 'keys match')
      st.kill()
      cleanDat()
      return true
    }, 'process started again')
    st.end()
  }
})

test('share prints shared directory', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var contains = output.indexOf('Sharing') > -1
    if (!contains) return false
    t.ok(output.indexOf(path.resolve(fixtures)) > -1, 'prints directory name')
    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('prints file information (live)', function (t) {
  // cmd: dat tests/fixtures
  var st = spawn(t, dat + ' ' + fixtures)
  st.stdout.match(function (output) {
    var finished = output.match('Added')
    if (!finished) return false

    t.ok(output.match(/2 items/), 'File count correct')
    t.ok(output.match(/1\.\d{1,2} kB/), 'File size correct')

    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('prints file information (snapshot)', function (t) {
  // cmd: dat tests/fixtures --snapshot
  var st = spawn(t, dat + ' ' + fixtures + ' --snapshot')
  st.stdout.match(function (output) {
    var finished = output.match('Added')
    if (!finished) return false

    t.ok(output.match(/2 items/), 'File count correct')
    t.ok(output.match(/1\.\d{1,2} kB/), 'File size correct')

    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('share with . arg defaults to cwd', function (t) {
  // cmd: dat .
  var st = spawn(t, dat + ' .', {cwd: fixtures})
  st.stdout.match(function (output) {
    var contains = output.indexOf('Sharing') > -1
    if (!contains) return false
    t.ok(output.indexOf(path.resolve(fixtures)) > -1, 'prints directory name')
    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('share with temp arg', function (t) {
  // cmd: dat . --temp
  var st = spawn(t, dat + ' . --temp', {cwd: fixtures})
  st.stdout.match(function (output) {
    var contains = output.indexOf('Sharing') > -1
    if (!contains) return false
    var datDir = path.join(fixtures, '.dat')
    t.pass('shares ok with temp')
    try {
      t.notOk(fs.statSync(datDir).isDirectory(), 'not a directory')
    } catch (e) {
      t.ok(e.code === 'ENOENT', 'dat dir not created')
    }
    st.kill()
    cleanDat()
    return true
  })
  st.end()
})

test('sharing existing directory begins sync', function (t) {
  // cmd: dat <link> .  then dat .
  var tmpdir = newTestFolder()
  var link = null
  var share = spawn(t, dat + ' ' + fixtures, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    link = matches
    startDownloader()
    return true
  }, 'share started')

  function startDownloader () {
    // cmd: dat <link> tmpdir
    var downloader = spawn(t, dat + ' ' + link + ' ' + tmpdir, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !share) return false
      downloader.kill()
      spawnShare()
      return true
    }, 'download one started')
    downloader.end()
  }

  function spawnShare () {
    var st = spawn(t, dat + ' ' + tmpdir)
    st.stdout.match(function (output) {
      var contains = output.indexOf('Connected to') > -1
      if (!contains) return false
      st.kill()
      cleanDat()
      return true
    })
    st.end()
  }
})

function newTestFolder () {
  var tmpdir = path.join(os.tmpdir(), 'dat-download-folder')
  rimraf.sync(tmpdir)
  mkdirp.sync(tmpdir)
  return tmpdir
}

function cleanDat () {
  rimraf.sync(path.join(fixtures, '.dat'))
}

function matchDatLink (output) {
  // TODO: dat.land links
  var match = output.match(/Link: [A-Za-z0-9]{64}/)
  if (!match) return false
  return match[0].split('Link: ')[1].trim()
}
