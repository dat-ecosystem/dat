var path = require('path')
var test = require('tape')
var spawn = require('./helpers/spawn.js')
var fs = require('fs')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')
var usage = fs.readFileSync(path.join(__dirname, '..', 'usage', 'root.txt'), 'utf8')

test('webrtc option fails if electron-webrtc not installed', function (t) {
  // cmd: dat tests/fixtures --webrtc
  try {
    require('electron-webrtc')
    t.skip('electron-webrtc installed, skipping fail test. Uninstall to test.')
    t.end()
  } catch (e) {
    var st = spawn(t, dat + ' ' + fixtures + ' --webrtc')
    st.fails('errors')
    st.end()
  }
})

test('doctor option works ', function (t) {
  // cmd: dat <fixtures-dir>
  var st = spawn(t, dat + ' ' + fixtures, {end: false})
  st.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    startDownloader(matches)
    return true
  }, 'dat link printed')

  function startDownloader (link) {
    // cmd: dat --doctor=<link>
    var downloader = spawn(t, dat + ' --doctor=' + link, {end: false})
    downloader.stdout.match(function (output) {
      if (output.indexOf('Public IP:') > -1) {
        st.kill()
        return true
      }
    }, 'download one started')
    downloader.end(function () {
      t.end()
    })
  }
})

test('prints usage', function (t) {
  // cmd: dat
  var d = spawn(t, dat)
  d.stderr.match(function (stderr) {
    return stderr === usage + '\n'
  })
  d.end()
})

test('webrtc option works with electron-webrtc installed', function (t) {
  // cmd: dat tests/fixtures --webrtc
  t.skip('TODO: somehow test this')
  t.end()
})

function matchDatLink (output) {
  // TODO: dat.land links
  var match = output.match(/Link: [A-Za-z0-9]{64}/)
  if (!match) return false
  return match[0].split('Link: ')[1].trim()
}
