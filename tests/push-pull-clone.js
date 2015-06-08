// var fs = require('fs')
// var os = require('os')
// var path = require('path')
// var test = require('tape')
// var spawn = require('tape-spawn')
// var helpers = require('./helpers')
//
// var tmp = os.tmpdir()
// var dat = path.resolve(__dirname + '/../cli.js')
// var dat1 = path.join(tmp, 'dat-clone-1')
//
// test('cli: dat -v (version)', function (t) {
//   var st = spawn(t, dat + ' -v')
//   var pkg = require('../package.json')
//   st.stdout.match(pkg.version + '\n')
//   st.stderr.empty()
//   st.end()
// })
