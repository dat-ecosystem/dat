var test = require('tape')
var rimraf = require('rimraf')
var os = require('os')
var spawn = require('tape-spawn')
var path = require('path')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var dat1 = path.join(__dirname, 'fixtures')
var tmp = os.tmpdir()

test('snapshot gives link', function (t) {
  var st = spawn(t, dat + ' snapshot ' + dat1 + ' --home=' + tmp)
  st.stdout.match(function (output) {
    t.equal(output.length, 65, 'version is 64 char + newline')
    return true
  })
  st.stderr.empty()
  st.end()
})

rimraf.sync(path.join(tmp, '.dat'))
