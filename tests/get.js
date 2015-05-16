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

test('dat import dataset', function (t) {
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('dat get from dataset', function (t) {
  var st = spawn(t, dat + ' get --dataset=get-test', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length === 10) {
      var line = JSON.parse(lines[0])
      if (line.key === 'ak11246285') {
        return line.value.latitude === '61.3482'
      }
      return true
    }
  })
  st.end()
})

test('dat get from dataset with csv', function (t) {
  var st = spawn(t, dat + ' get --dataset=get-test --format=csv', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var lines = output.split('\n')
    if (lines.length === 11) { // 1 header row + 10 lines
      var headers = lines[0].split(',')
      t.equals(headers.length, 16)
      return true
    }
    return false
  })
  st.end()
})

test('dat get a key from dataset', function (t) {
  var st = spawn(t, dat + ' get ak11246293 --dataset=get-test', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    output = JSON.parse(output)
    if (output.key === 'ak11246293' && output.value.latitude === '60.0366') return true
    return false
  })
  st.end()
})
