var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)
var json = path.resolve(__dirname + '/fixtures/all_hour.json')

test('dat add dataset', function (t) {
  var st = spawn(t, dat + ' add ' + json + ' --key=id --dataset=test-dataset', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

test('dat get from dataset', function (t) {
  var st = spawn(t, dat + ' get --dataset=test-dataset', {cwd: dat1})
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

test('dat get a key from dataset', function (t) {
  var st = spawn(t, dat + ' get ak11246293 --dataset=test-dataset', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    output = JSON.parse(output)
    if (output.key === 'ak11246293' && output.value.latitude === '60.0366') return true
    return false
  })
  st.end()
})
