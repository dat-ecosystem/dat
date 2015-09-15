var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-add-1')

helpers.onedat(dat1)

test('add: dat add to file', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' add test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Stored test-file\.txt successfully/)
  st.end()
})

test('add: dat get after write to dataset', function (t) {
  var st = spawn(t, dat + ' get test-file.txt', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match('hello world\n')
  st.end()
})
