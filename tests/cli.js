var fs = require('fs')
var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-cli-1')

test('cli: dat -v (version)', function (t) {
  var st = spawn(t, dat + ' -v')
  var pkg = require('../package.json')
  st.stdout.match(pkg.version + '\n')
  st.stderr.empty()
  st.end()
})

test('cli: dat --version (version)', function (t) {
  var st = spawn(t, dat + ' --version')
  var pkg = require('../package.json')
  st.stdout.match(pkg.version + '\n')
  st.stderr.empty()
  st.end()
})

test('cli: dat (usage)', function (t) {
  var st = spawn(t, dat)
  st.stderr.match(fs.readFileSync(path.join('usage', 'root.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

test('cli: dat init -h (init usage)', function (t) {
  var st = spawn(t, dat + ' init -h')
  st.stderr.match(fs.readFileSync(path.join('usage', 'init.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

test('cli: invalid command', function (t) {
  var st = spawn(t, dat + ' pizza')
  st.stderr.match('dat: pizza is not a valid command\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

var cleanup = helpers.onedat(dat1)

var tmp = os.tmpdir()

// sanity: make sure cwd isn't in a repo
test('cli: dat status (cwd)', function (t) {
  var st = spawn(t, dat + ' status')
  st.stderr.match(/This is not a dat repository/)
  st.stdout.empty()
  st.end()
})

test('cli: dat -p (path)', function (t) {
  var st = spawn(t, dat + ' status -p ' + dat1, {cwd: tmp})
  st.stderr.match(/1 file/)
  st.stdout.empty()
  st.end()
})

test('cli: dat --path (path)', function (t) {
  var st = spawn(t, dat + ' status --path=' + dat1, {cwd: tmp})
  st.stderr.match(/1 file/)
  st.stdout.empty()
  st.end()
})

test('cli: dat status --json', function (t) {
  var st = spawn(t, dat + ' status --json --path=' + dat1, {cwd: tmp})
  st.stdout.match(/\"files\"\:1/)
  st.stderr.empty()
  st.end()
})

test('cli: dat get nonexistent key', function (t) {
  var st = spawn(t, dat + ' get bar -d foo --path=' + dat1)
  st.stderr.match(/Could not find key bar in dataset foo/)
  st.stdout.empty()
  st.end()
})

test('cli: dat get without dataset', function (t) {
  var st = spawn(t, dat + ' get bar --path=' + dat1)
  st.stderr.match(/Must specify dataset/)
  st.stdout.empty()
  st.end()
})

test('cli: dat import without dataset', function (t) {
  var st = spawn(t, dat + ' import bar --path=' + dat1)
  st.stderr.match(/Must specify dataset/)
  st.stdout.empty()
  st.end()
})

test('cli: dat export without dataset', function (t) {
  var st = spawn(t, dat + ' export bar --path=' + dat1)
  st.stderr.match(/Must specify dataset/)
  st.stdout.empty()
  st.end()
})

test('cli: cleanup', function (t) {
  cleanup()
  t.end()
})
