var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tempDir = require('temporary-directory')
var spawn = require('./helpers/spawn.js')
var help = require('./helpers')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(fixtures, '.DS_Store')) } catch (e) { /* ignore error */ }

// start without dat.json
try { fs.unlinkSync(path.join(fixtures, 'dat.json')) } catch (e) { /* ignore error */ }

test('create - default opts no import', function (t) {
  tempDir(function (_, dir, cleanup) {
    var cmd = dat + ' create'
    var st = spawn(t, cmd, {cwd: dir})

    st.stdout.match(function (output) {
      var datCreated = output.indexOf('All files') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(fixtures, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - default opts with import', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  // cmd: dat create
  var cmd = dat + ' create --import'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stdout.match(function (output) {
    var importFinished = output.indexOf('import finished') > -1
    if (!importFinished) return false

    t.ok(help.isDir(path.join(fixtures, '.dat')), 'creates dat directory')

    var fileRe = new RegExp('3 files')
    var bytesRe = new RegExp(/1\.\d{1,2} kB/)

    t.ok(help.matchLink(output), 'prints link')
    t.ok(output.indexOf('tests/fixtures') > -1, 'prints dir')
    t.ok(output.match(fileRe), 'total size: files okay')
    t.ok(output.match(bytesRe), 'total size: bytes okay')

    t.same(help.datJson(fixtures).title, 'fixtures', 'dat.json: has title')

    st.kill()
    return true
  })
  st.succeeds('exits after create finishes')
  st.stderr.empty()
  st.end()
})

test('create - errors on existing archive', function (t) {
  // cmd: dat create
  var cmd = dat + ' create'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stderr.match(function (output) {
    t.ok(output.indexOf('Archive already exists') > -1, 'already exists error')
    st.kill()
    return true
  })
  st.end()
})

test('pull - pull fails on created archive', function (t) {
  // cmd: dat create
  var cmd = dat + ' pull'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stderr.match(function (output) {
    t.ok(output.indexOf('Cannot pull an archive that you own.') > -1, 'cannot pull on create error')
    st.kill()
    return true
  })
  st.end()
})

test('create - sync after create ok', function (t) {
  // cmd: dat sync
  var cmd = dat + ' sync '
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stdout.match(function (output) {
    var connected = output.indexOf('Looking for connections') > -1
    if (!connected) return false
    t.ok('Dat Network', 'Shares over dat network')
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('create - quiet only prints link', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  var cmd = dat + ' create --quiet'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stderr.empty()
  st.stdout.match(function (output) {
    var link = help.matchLink(output)
    if (!link) return false
    t.ok(link, 'prints link')
    st.kill()
    return true
  })
  st.end()
})

test('create - init alias okay', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  var cmd = dat + ' init --import'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stderr.empty()
  st.stdout.match(function (output) {
    var importFinished = output.indexOf('import finished') > -1
    if (!importFinished) return false
    t.pass('init did create')
    st.kill()
    return true
  })
  st.end()
})

test('create - with path', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  var cmd = dat + ' create --import ' + fixtures
  var st = spawn(t, cmd)

  st.stderr.empty()
  st.stdout.match(function (output) {
    var importFinished = output.indexOf('import finished') > -1
    if (!importFinished) return false
    t.ok(output.indexOf('dat-next/tests/fixtures'), 'prints correct dir')
    st.kill()
    return true
  })
  st.end()
})

test.onFinish(function () {
  rimraf.sync(path.join(fixtures, '.dat'))
})
