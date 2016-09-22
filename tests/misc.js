var path = require('path')
var test = require('tape')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

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

test('webrtc option works with electron-webrtc installed', function (t) {
  // cmd: dat tests/fixtures --webrtc
  t.skip('TODO: somehow test this')
  t.end()
})
