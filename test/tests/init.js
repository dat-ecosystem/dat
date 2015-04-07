var test = require('tape')
var spawn = require('tape-spawn')

test('dat -v', function (t) {
  var st = spawn(t, "node cli.js -v")
  var pkg = require('../../package.json')
  st.stdout.match(pkg.version + '\n')
  st.stderr.empty()
  st.end()
})

// test('CLI dat w/ no args', function(t) {
//   if (common.rpc) return t.end()
//   common.destroyTmpDats(function() {
//     mkdirp(common.dat1tmp, function(err) {
//       t.notOk(err, 'no err')
//       var dat = spawn(datCliPath, [], {cwd: common.dat1tmp, env: process.env})
//       getFirstOutput(dat.stderr, verify)
//
//       function verify(output) {
//         var success = (output.indexOf('Usage') > -1)
//         if (!success) console.log(['output:', output])
//         t.ok(success, 'output matches')
//         kill(dat.pid)
//         common.destroyTmpDats(function() {
//           t.end()
//         })
//       }
//
//     })
//   })
// })
//
//
//
//   test('CLI dat init', function(t) {
//     if (common.rpc) return t.end()
//     common.destroyTmpDats(function() {
//       mkdirp(common.dat1tmp, function(err) {
//         t.notOk(err, 'no err')
//         var dat = spawn(datCliPath, ['init', '--no-prompt'], {cwd: common.dat1tmp, env: process.env})
//         dat.on('exit', function (code, signal) {
//           t.equals(code, 0, 'init exits with code 0')
//         })
//         getFirstOutput(dat.stdout, verify)
//
//         function verify(output) {
//           var success = (output.indexOf('Initialized dat store') > -1)
//           if (!success) console.log(['output:', output])
//           t.ok(success, 'output matches')
//           var port = fs.existsSync(path.join(common.dat1tmp, '.dat', 'PORT'))
//           t.false(port, 'should have no PORT file')
//           kill(dat.pid)
//           common.destroyTmpDats(function() {
//             t.end()
//           })
//         }
//
//       })
//     })
//   })

