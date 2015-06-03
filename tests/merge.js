var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var through = require('through2')
var parallel = require('run-parallel')
var ndjson = require('ndjson')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var forks, diff

var dat1 = path.join(tmp, 'dat-merge-1')
var dat2 = path.join(tmp, 'dat-merge-2')

helpers.twodats(dat1, dat2)
helpers.conflict(dat1, dat2, 'merge-test', function (conflictForks) {
  forks = conflictForks
})

test('merge: dat1 diff', function (t) {
  var st = spawn(t, dat + ' diff --json ' + forks.remotes[0], {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      diff = JSON.parse(output)
    } catch (e) {
      return false
    }
    if (diff.versions[0].value.name === 'MAX' && diff.versions[1].value.name === 'Max') return true
  })
  st.end()
})

test('merge: dat1 diff pretty printed', function (t) {
  var st = spawn(t, dat + ' diff ' + forks.remotes[0], {cwd: dat1})
  st.stderr.empty()
  st.stdout.match(/MAX -> Max/)
  st.end()
})

test('merge: dat1 diff | merge', function (t) {
  var diff = spawn(t, dat + ' diff --json ' + forks.remotes[0], {cwd: dat1, end: false})
  var merge = spawn(t, dat + ' merge ' + forks.remotes[0] + ' -', {cwd: dat1, end: false})

  diff.stdout.stream
    .pipe(ndjson.parse())
    .pipe(through.obj(function (obj, enc, next) {
      next(null, obj.versions[0]) // choose left
    }))
    .pipe(ndjson.serialize())
    .pipe(merge.stdin)

  diff.stderr.empty()
  merge.stdout.empty()
  merge.stderr.match(/Merged/)

  parallel([merge.end.bind(merge), diff.end.bind(diff)], function () {
    t.end()
  })
})

test('merge: verify merge version', function (t) {
  var st = spawn(t, dat + ' export -d merge-test', {cwd: dat1})

  st.stderr.empty()
  st.stdout.match(function match (output) {
    try {
      output = JSON.parse(output)
      return output.name === 'MAX'
    } catch (e) {
      return false
    }
  })

  st.end()
})
