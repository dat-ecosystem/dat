var fs = require('fs')
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

function cleanDat () {
  rimraf.sync(path.join(fixtures, '.dat'))
}

function matchDatLink (output) {
  // TODO: dat.land links
  var match = output.match(/Link: [A-Za-z0-9]{64}/)
  if (!match) return false
  return match[0].split('Link: ')[1].trim()
}
