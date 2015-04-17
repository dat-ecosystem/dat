var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var tmp = require('os').tmpdir()
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var dat = path.resolve(__dirname + '/../cli.js')

module.exports = function (cb) {
  var dat1 = path.join(tmp, 'dat-1')
  var dat2 = path.join(tmp, 'dat-2')

  rimraf.sync(dat1)
  rimraf.sync(dat2)
  mkdirp.sync(dat1)
  mkdirp.sync(dat2)

  test('dat1 init', function (t) {
    var st = spawn(t, dat + ' init', {cwd: dat1})
    st.stderr.match(/Initialized a new dat/)
    st.stdout.empty()
    st.end()
  })

  test('dat2 init', function (t) {
    var st = spawn(t, dat + ' init', {cwd: dat2})
    st.stderr.match(/Initialized a new dat/)
    st.stdout.empty()
    st.end()
  })

  cb(dat1, dat2)
}
