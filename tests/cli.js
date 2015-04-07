var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')

test('dat -v (version)', function (t) {
  var st = spawn(t, "node cli.js -v")
  var pkg = require('../package.json')
  st.stdout.match(pkg.version + '\n')
  st.stderr.empty()
  st.end()
})

test('dat (usage)', function (t) {
  var st = spawn(t, "node cli.js")
  st.stderr.match(fs.readFileSync(path.join('usage', 'root.txt')).toString() + '\n', 'usage matched')
  st.stdout.empty()
  st.end()
})

test('invalid command', function (t) {
  var st = spawn(t, "node cli.js pizza")
  st.stderr.match('dat: pizza is not a valid command\n', 'usage matched')
  st.stdout.empty()
  st.end()
})
