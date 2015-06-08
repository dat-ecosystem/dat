var os = require('os')
var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)
var json = path.resolve(__dirname + '/fixtures/all_hour.json')

test('get: dat import dataset', function (t) {
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('get: dat get a key from dataset', function (t) {
  var st = spawn(t, dat + ' get ak11246293 --dataset=get-test', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    output = JSON.parse(output)
    if (output.key === 'ak11246293' && output.value.latitude === '60.0366') return true
    return false
  })
  st.end()
})

test('get: dat get without key errors', function (t) {
  var st = spawn(t, dat + ' get --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'get.txt')).toString() + '\n', 'usage matched')
  st.end()
})

test('get: dat get without dataset errors', function (t) {
  var st = spawn(t, dat + ' get ak11246293', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('get: dat get without key and dataset errors', function (t) {
  var st = spawn(t, dat + ' get', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'get.txt')).toString() + '\n', 'usage matched')
  st.end()
})
