var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')
var dat2 = path.join(tmp, 'dat-2')
var dat3 = path.join(tmp, 'dat-3')

helpers.onedat(dat1)

test('dat import w/ no dataset arg', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Must specify dataset/)
  st.end()
})

test('dat import csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id --dataset=import-test1', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test1', dat1)

helpers.onedat(dat2)

test('dat import json', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test2', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test2', dat2)

helpers.onedat(dat3)

test('dat import all_hour to test3', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test3', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test3', dat3)

test('dat import all_hour to separate dataset', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --key=id --dataset=import-test4', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

verify('import-test4', dat3)

test('dat import with json output', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' import ' + json + ' --json --key=id --dataset=import-test5', {cwd: dat3})
  st.stdout.match(function (output) {
    var json = JSON.parse(output)
    return json.version.length === 64 // 32bit hash 2 in hex (64)
  })
  st.stderr.empty()
  st.end()
})

function verify (dataset, dir) {
  test('dat export', function (t) {
    var st = spawn(t, dat + ' export --dataset=' + dataset, {cwd: dir})
    st.stderr.empty()
    st.stdout.match(function (output) {
      var lines = output.split('\n')
      t.ok(lines.length <= 10, 'less than 10 lines')
      if (lines.length === 10) {
        if (JSON.parse(lines[0]).key === 'ak11246285') return true
        return false
      }
    })
    st.end()
  })
}
