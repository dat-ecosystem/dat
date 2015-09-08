var os = require('os')
var path = require('path')
var fs = require('fs')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var version

var dat1 = path.join(tmp, 'dat-diff-1')
var dat2 = path.join(tmp, 'dat-diff-2')

helpers.twodats(dat1, dat2)

test('diff: dat1 diff without version', function (t) {
  var st = spawn(t, dat + ' diff', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(fs.readFileSync(path.join('usage', 'diff.txt')).toString() + '\n', 'usage matched')
  st.end()
})

test('diff: dat import csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/a.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id --dataset=diff-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('diff: dat1 status as json', function (t) {
  var st = spawn(t, dat + ' status --json', {cwd: dat1})
  st.stdout.match(function (output) {
    try {
      var json = JSON.parse(output).status
      version = json.version
      return json.version.length === 64 // 32bit hash 2 in hex (64)
    } catch (e) {
      return false
    }
  })
  st.stderr.empty()
  st.end()
})

test('diff: dat import csv 2', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/b.csv')
  var st = spawn(t, dat + ' import ' + csv + ' --key=id --dataset=diff-test', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done importing data/)
  st.end()
})

test('merge: dat1 diff pretty printed', function (t) {
  var st = spawn(t, dat + ' diff ' + version, {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/Max -> max/)
  st.end()
})

// helpers.conflict(dat1, dat2, 'diff-test', function (conflictForks) {
//   forks = conflictForks
// })
