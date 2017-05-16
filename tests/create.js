var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tempDir = require('temporary-directory')
var Dat = require('dat-node')
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
      var datCreated = output.indexOf('All files imported') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - default opts with import', function (t) {
  tempDir(function (_, dir, cleanup) {
    var cmd = dat + ' create --import'
    var st = spawn(t, cmd, {cwd: dir})

    st.stdout.match(function (output) {
      var importFinished = output.indexOf('All files imported') > -1
      if (!importFinished) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')
      t.ok(help.matchLink(output), 'prints link')
      t.skip(help.datJson(fixtures).title, 'fixtures', 'dat.json: has title')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - errors on existing archive', function (t) {
  tempDir(function (_, dir, cleanup) {
    Dat(dir, function (err, dat) {
      t.error(err, 'no error')
      dat.close(function () {
        var cmd = dat + ' create'
        var st = spawn(t, cmd, {cwd: dir})
        st.stderr.match(function (output) {
          t.ok(output, 'errors')
          st.kill()
          return true
        })
        st.end()
      })
    })
  })
})

test('create - sync after create ok', function (t) {
  tempDir(function (_, dir, cleanup) {
    var cmd = dat + ' create'
    var st = spawn(t, cmd, {cwd: dir, end: false})
    st.stdout.match(function (output) {
      var connected = output.indexOf('All files imported') > -1
      if (!connected) return false
      doSync()
      return true
    })

    function doSync () {
      var cmd = dat + ' sync '
      var st = spawn(t, cmd, {cwd: dir})

      st.stdout.match(function (output) {
        var connected = output.indexOf('Sharing') > -1
        if (!connected) return false
        st.kill()
        return true
      })
      st.stderr.empty()
      st.end(cleanup)
    }
  })
})

test('create - init alias', function (t) {
  tempDir(function (_, dir, cleanup) {
    var cmd = dat + ' init'
    var st = spawn(t, cmd, {cwd: dir})

    st.stdout.match(function (output) {
      var datCreated = output.indexOf('All files imported') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - with path', function (t) {
  tempDir(function (_, dir, cleanup) {
    var cmd = dat + ' init ' + dir
    var st = spawn(t, cmd)
    st.stdout.match(function (output) {
      var datCreated = output.indexOf('All files imported') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})
