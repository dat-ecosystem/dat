var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)

test('dat write', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' write test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done writing binary data/)
  st.end()
})

test('dat cat after write', function (t) {
  var st = spawn(t, dat + ' cat test-file.txt', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/hello world/)
  st.end()
})

test('dat write to dataset', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' write -d my-dataset test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done writing binary data/)
  st.end()
})

test('dat cat after write to dataset', function (t) {
  var st = spawn(t, dat + ' cat test-file.txt -d my-dataset', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/hello world/)
  st.end()
})

test('dat write to dataset', function (t) {
  var st = spawn(t, "echo 'goodbye world' | " + dat + ' write -d my-dataset-2 test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done writing binary data/)
  st.end()
})

test('dat cat after write to dataset 2', function (t) {
  var st = spawn(t, dat + ' cat test-file.txt -d my-dataset-2', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/goodbye world/)
  st.end()
})

test('dat overwrite to dataset', function (t) {
  var st = spawn(t, "echo 'goodbye mars' | " + dat + ' write -d my-dataset-2 test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done writing binary data/)
  st.end()
})

test('dat cat after overwrite to dataset', function (t) {
  var st = spawn(t, dat + ' cat test-file.txt -d my-dataset-2', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/goodbye mars/)
  st.end()
})
