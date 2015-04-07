var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')

test('dat -v (version)', function (t) {
  var st = spawn(t, "node cli.js -v")
  var pkg = require('../../package.json')
  st.stdout.match(pkg.version + '\n')
  st.stderr.empty()
  st.end()
})

test('dat (usage)', function (t) {
  var st = spawn(t, "node cli.js")
  st.stdout.match(fs.readFileSync(path.join('bin', 'usage.txt')).toString() + '\n', 'usage matched')
  st.stderr.empty()
  st.end()
})
