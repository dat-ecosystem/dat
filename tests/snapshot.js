var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')
var help = require('./helpers')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(fixtures, '.DS_Store')) } catch (e) { /* ignore error */ }

test('snapshot - default opts', function (t) {
  rimraf.sync(path.join(fixtures, '.dat'))
  // cmd: dat snapshot
  var cmd = dat + ' snapshot'
  var st = spawn(t, cmd, {cwd: fixtures})

  st.stdout.match(function (output) {
    var importFinished = output.indexOf('Snapshot created') > -1
    if (!importFinished) return false

    t.ok(help.isDir(path.join(fixtures, '.dat')), 'creates dat directory')

    var fileRe = new RegExp('3 files')
    var bytesRe = new RegExp(/1\.\d{1,2} kB/)

    t.ok(help.matchLink(output), 'prints link')
    t.ok(output.indexOf('tests/fixtures') > -1, 'prints dir')
    t.ok(output.match(fileRe), 'total size: files okay')
    t.ok(output.match(bytesRe), 'total size: bytes okay')
    st.kill()
    return true
  })
  st.succeeds('exits after create finishes')
  st.stderr.empty()
  st.end()
})

test('snapshot - errors on existing archive', function (t) {
  // cmd: dat snapshot
  var cmd = dat + ' snapshot'
  var st = spawn(t, cmd, {cwd: fixtures})

  // st.stdout.empty() Sometimes init statement is getting printed, causing failure
  st.stderr.match(function (output) {
    t.ok(output.indexOf('Archive already exists') > -1, 'cannot overwrite error')
    st.kill()
    return true
  })
  st.end()
})

// TODO: archive.owner is false for snapshot on resume. Hyperdrive bug?
// test('snapshot - sync after create ok', function (t) {
//   // cmd: dat sync
//   var cmd = dat + ' sync '
//   var st = spawn(t, cmd, {cwd: fixtures})

//   st.stdout.match(function (output) {
//     var connected = output.indexOf('Sharing latest') > -1
//     if (!connected) return false
//     t.ok('Dat Network', 'Shares over dat network')
//     st.kill()
//     return true
//   })
//   st.stderr.empty()
//   st.end()
// })

test.onFinish(function () {
  rimraf.sync(path.join(fixtures, '.dat'))
})
