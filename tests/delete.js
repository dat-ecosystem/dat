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
    if (output.value.id === 'ak11246293' && output.value.latitude === '60.0366') return true
    return false
  })
  st.end()
})

test('get: dat delete a key from dataset', function (t) {
  var st = spawn(t, dat + ' delete ak11246293 --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Deleted successfully/)
  st.end()
})

test('get: dat get a key from dataset after delete', function (t) {
  var st = spawn(t, dat + ' get ak11246293 --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Error/)
  st.end()
})

test('get: dat delete without key and dataset errors', function (t) {
  var st = spawn(t, dat + ' delete', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'delete.txt')).toString() + '\n', 'usage matched')
  st.end()
})

test('get: dat delete without key errors', function (t) {
  var st = spawn(t, dat + ' delete --dataset=get-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'delete.txt')).toString() + '\n', 'usage matched')
  st.end()
})

test('get: dat delete without dataset errors', function (t) {
  var st = spawn(t, dat + ' delete ak11246293', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('get: dat delete without key and dataset errors', function (t) {
  var st = spawn(t, dat + ' delete', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'delete.txt')).toString() + '\n', 'usage matched')
  st.end()
})
