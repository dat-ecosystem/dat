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

test('dat get after write', function (t) {
  var st = spawn(t, dat + ' cat test-file.txt', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/hello world/)
  st.end()
})
