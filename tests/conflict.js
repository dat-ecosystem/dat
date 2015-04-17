var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')

var dat = path.resolve(__dirname + '/../cli.js')

module.exports = function (dat1, dat2, csvs, cb) {
  test('dat1 add', function (t) {
    var st = spawn(t, dat + ' add ' + csvs.a, {cwd: dat2})
    st.stderr.match(/Done adding data/)
    st.stdout.empty()
    st.end()
  })

  test('dat2 pull dat1', function (t) {
    var st = spawn(t, dat + ' pull ' + dat1, {cwd: dat2})
    st.stderr.empty()
    st.stdout.empty()
    st.end()
  })

  test('dat2 add b', function (t) {
    var st = spawn(t, dat + ' add ' + csvs.b, {cwd: dat2})
    st.stderr.match(/Done adding data/)
    st.stdout.empty()
    st.end()
  })

  test('dat1 add c', function (t) {
    var st = spawn(t, dat + ' add ' + csvs.c, {cwd: dat1})
    st.stderr.match(/Done adding data/)
    st.stdout.empty()
    st.end()
  })

  test('dat1 pull dat2', function (t) {
    var st = spawn(t, dat + ' pull ' + dat2, {cwd: dat1})
    st.stderr.empty()
    st.stdout.empty()
    st.end()
  })
  cb(dat1, dat2)
}
