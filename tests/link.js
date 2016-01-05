var test = require('tape')
var after = require('after')
var rimraf = require('rimraf')
var os = require('os')
var spawn = require('tape-spawn')
var path = require('path')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var dat1 = path.join(__dirname, 'fixtures')
var tmp = os.tmpdir()
var dat1link

test('prints link', function (t) {
  var st = spawn(t, dat + ' link ' + dat1 + ' --home=' + tmp)
  st.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    dat1link = output.toString()
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('link with no args defaults to cwd', function (t) {
  var st = spawn(t, dat + ' link --home=' + tmp, {cwd: dat1})
  st.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    t.equal(output.toString(), dat1link, 'links match')
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('prints link and stays open for download', function (t) {
  var link, download
  var share = spawn(t, dat + ' link ' + dat1 + ' --home=' + tmp, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    link = output.trim()
    download = spawn(t, dat + ' ' + link + ' --path=' + tmp + ' --home=' + tmp, {end: false})
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
    var next = after(2, t.end.bind(t))
    share.end(next)
    download.end(next)
  }
})

rimraf.sync(path.join(tmp, '.dat'))
