var test = require('tape')
var rimraf = require('rimraf')
var os = require('os')
var spawn = require('tape-spawn')
var path = require('path')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var dat1 = path.join(__dirname, 'fixtures')
var tmp = os.tmpdir()

test('share gives link', function (t) {
  var st = spawn(t, dat + ' share ' + dat1 + ' --home=' + tmp)
  st.stdout.match(function (output) {
    console.error(output)
    t.equal(output.length, 65, 'version is 64 char + newline')
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('share gives link and stays open for download', function (t) {
  var link, download
  var share = spawn(t, dat + ' share ' + dat1 + ' --home=' + tmp)
  share.stderr.empty()
  share.stdout.match(function (output) {
    t.equal(output.length, 65, 'version is 64 char + newline')
    link = output.trim()
    download = spawn(t, dat + ' ' + link + ' ' + tmp + ' --home=' + tmp)
    var line = 0
    download.stderr.empty()
    download.stdout.match(function (output) {
      output = output.split('\n')[line]
      line += 1
      if (output === 'Done downloading.') {
        download.kill()
        share.kill()
        cleanup()
        return true
      }
    })
    return true
  })
  function cleanup () {
    share.end()
  }
})

rimraf.sync(path.join(tmp, '.dat'))
