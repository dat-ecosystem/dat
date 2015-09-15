var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-add-1')
var dat2 = path.join(tmp, 'dat-add-2')

helpers.onedat(dat1)

test('add: dat add csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' add ' + csv + ' --key=id --dataset=add-test1', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('add-test1', dat1)

helpers.onedat(dat2)

test('add: dat add json', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' add ' + json + ' --key=id --dataset=add-test2', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('add: dat add to dataset', function (t) {
  var st = spawn(t, "echo 'hello world' | " + dat + ' add test-file.txt -', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Stored test-file\.txt successfully/)
  st.end()
})

test('add: dat read after write to dataset', function (t) {
  var st = spawn(t, dat + ' read test-file.txt', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match('hello world\n')
  st.end()
})

// helper

function verify (dataset, dir) {
  test('import: dat export ' + dataset, function (t) {
    var st = spawn(t, dat + ' export --dataset=' + dataset, {cwd: dir})
    st.stderr.empty()
    st.stdout.match(function (output) {
      var lines = output.split('\n')
      if (lines.length === 10) {
        if (JSON.parse(lines[0]).id === 'ak11246285') return true
        return false
      }
    })
    st.end()
  })
}
