var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')

test('help: dat import -h', function (t) {
  var st = spawn(t, 'node cli.js import -h')
  st.stderr.match(fs.readFileSync(path.join('usage', 'import.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

test('help: dat init -h', function (t) {
  var st = spawn(t, 'node cli.js init -h')
  st.stderr.match(fs.readFileSync(path.join('usage', 'init.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

test('help: dat read -h', function (t) {
  var st = spawn(t, 'node cli.js read -h')
  st.stderr.match(fs.readFileSync(path.join('usage', 'read.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})
