var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-import-1')
var dat2 = path.join(tmp, 'dat-import-2')
var dat3 = path.join(tmp, 'dat-import-3')
var dat4 = path.join(tmp, 'dat-import-4')

helpers.onedat(dat1)

test('import: dat import w/ no dataset arg', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('import: dat import csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id --dataset=import-test1', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test1', dat1)

helpers.onedat(dat2)

test('import: dat import json', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test2', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('import: dat import json with compound key', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --keys=latitude,longitude -d compound', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('import: dat keys get integer id', function (t) {
  var st = spawn(t, dat + ' keys -d compound', {cwd: dat2})
  st.stdout.match(function (output) {
    var keys = output.split('\n')
    t.same(keys[0], '33.9233322+-117.9376678')
    return true
  })
  st.stderr.empty()
  st.end()
})

test('import: dat import json with integer id', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=int --dataset=int-id', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('import: dat keys get integer id', function (t) {
  var st = spawn(t, dat + ' keys --dataset=int-id', {cwd: dat2})
  st.stdout.match(/1/)
  st.stderr.empty()
  st.end()
})

test('import: dat import csv with json flag', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + json + ' --json --key=id --dataset=import-test2', {cwd: dat2})
  st.stdout.match(/version/)
  st.stderr.empty()
  st.end()
})

verify('import-test2', dat2)

helpers.onedat(dat3)

test('import: dat import all_hour to test3', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test3', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test3', dat3)

test('import: dat status after first import', function (t) {
  var st = spawn(t, dat + ' status --json', {cwd: dat3})
  st.stderr.empty()
  st.stdout.match(/\"versions\":2\,/)
  st.end()
})

test('import: dat import all_hour to separate dataset', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test4', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test4', dat3)

test('import: dat status after second import', function (t) {
  var st = spawn(t, dat + ' status --json', {cwd: dat3})
  st.stderr.empty()
  st.stdout.match(/\"versions\":3\,/)
  st.end()
})

test('import: dat import with json output', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --json --key=id --dataset=import-test5', {cwd: dat3})
  st.stdout.match(function (output) {
    var json = JSON.parse(output)
    return json.version.length === 64 // 32bit hash 2 in hex (64)
  })
  st.stderr.empty()
  st.end()
})

test('import: dat datasets (list datasets)', function (t) {
  var st = spawn(t, dat + ' datasets', {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(/import-test2/)
  st.end()
})

helpers.onedat(dat4)

test('import: dat import with a message', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test3 -m "im a message"', {cwd: dat4})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('import: dat import with a message', function (t) {
  var st = spawn(t, dat + ' log', {cwd: dat4})
  st.stdout.match(/im a message/)
  st.stderr.empty()
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
