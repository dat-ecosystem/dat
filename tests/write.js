var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)

test('dat import csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('dat put', function (t) {
  var st = spawn(t, dat + ' put ak11246285 "hello-world" --format=json', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

test('dat put', function (t) {
  var st = spawn(t, dat + ' get ak11246285', {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function (output) {
    var row = JSON.parse(output)
    if (row.key === 'ak11246285') {
      t.same(row.value, 'hello-world')
      return true
    }
    return false
  })
  st.end()
})
