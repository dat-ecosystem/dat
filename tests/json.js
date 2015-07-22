var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')
var csvA = path.resolve(__dirname + '/fixtures/a.csv')
var dat1 = helpers.randomTmpDir()
var dat2 = helpers.randomTmpDir()

var cleanup = helpers.onedat(dat1)

// purpose of this file is to test every command with --json to ensure consistent json output
// TODO
// destroy
// diff
// export
// files
// forks
// get
// import
// init
// keys
// log
// merge
// pull
// push
// read
// replicate
// root
// serve
// write

test('cli: dat checkout --json', function (t) {
  helpers.exec(dat + ' log --json --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    var first = JSON.parse(out.stdout.toString().split('\n')[0]).version
    var st = spawn(t, dat + ' checkout ' + first + ' --json --path=' + dat1, {cwd: tmp, end: false})
    st.stdout.match(new RegExp('"version":"' + first + '"'))
    st.stderr.empty()
    st.end(function () {
      helpers.exec(dat + ' checkout latest --path=' + dat1, {cwd: tmp}, function (err, out) {
        if (err) return t.ifErr(err)
        t.end()
      })
    })
  })
})

test('cli: dat clone --json', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' ' + dat2 + ' --json', {cwd: tmp})
  st.stdout.match(new RegExp('"cloned":true'))
  st.stderr.empty()
  st.end()
})

test('cli: dat datasets --json', function (t) {
  var st = spawn(t, dat + ' datasets --json --path=' + dat1, {cwd: tmp})
  st.stdout.match('{"datasets":["files"]}\n')
  st.stderr.empty()
  st.end()
})

test('cli: dat delete --json', function (t) {
  helpers.exec(dat + ' import -d foo ' + csvA + ' --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    var st = spawn(t, dat + ' delete 1 -d foo --json --path=' + dat1, {cwd: tmp})
    st.stdout.match(new RegExp('"deleted":"1"'))
    st.stderr.empty()
    st.end()
  })
})

test('cli: dat status --json', function (t) {
  var st = spawn(t, dat + ' status --json --path=' + dat1, {cwd: tmp})
  st.stdout.match(new RegExp('"files"'))
  st.stdout.match(new RegExp('"rows"'))
  st.stderr.empty()
  st.end()
})

test('cli: cleanup', function (t) {
  cleanup()
  t.end()
})
