var os = require('os')
var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var initDat = require('./helpers/init-dat.js')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

initDat(test, dat1)

test('dat add csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' add ' + csv + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify()

initDat(test, dat1)

test('dat add json', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' add ' + json + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify()

function verify () {
  test('dat cat', function (t) {
    var st = spawn(t, dat + ' cat', {cwd: dat1})
    st.stderr.empty()
    st.stdout.match(function (output) {
      var lines = output.split('\n')
      if (lines.length === 10) {
        if (JSON.parse(lines[0]).key === 'ak11246285') return true
        return false
      }
    })
    st.end()
  })
}
