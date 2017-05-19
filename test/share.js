// var fs = require('fs')
// var path = require('path')
// var test = require('tape')
// var rimraf = require('rimraf')
// var spawn = require('./helpers/spawn.js')
// var help = require('./helpers')

// var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
// if (process.env.TRAVIS) dat += ' --no-watch '
// var fixtures = path.join(__dirname, 'fixtures')

// // os x adds this if you view the fixtures in finder and breaks the file count assertions
// try { fs.unlinkSync(path.join(fixtures, '.DS_Store')) } catch (e) { /* ignore error */ }

// // start without dat.json
// try { fs.unlinkSync(path.join(fixtures, 'dat.json')) } catch (e) { /* ignore error */ }

// test('share - default opts', function (t) {
//   rimraf.sync(path.join(fixtures, '.dat'))
//   var cmd = dat + ' share'
//   var st = spawn(t, cmd, {cwd: fixtures})

//   st.stdout.match(function (output) {
//     var importFinished = output.indexOf('Total Size') > -1
//     if (!importFinished) return false

//     t.ok(help.isDir(path.join(fixtures, '.dat')), 'creates dat directory')
//     t.ok(output.indexOf('Looking for connections') > -1, 'network')

//     st.kill()
//     return true
//   })
//   st.stderr.empty()
//   st.end()
// })

// test('share - with dir arg', function (t) {
//   rimraf.sync(path.join(fixtures, '.dat'))
//   var cmd = dat + ' share ' + fixtures
//   var st = spawn(t, cmd)

//   st.stdout.match(function (output) {
//     var importFinished = output.indexOf('Total Size') > -1
//     if (!importFinished) return false

//     t.ok(help.isDir(path.join(fixtures, '.dat')), 'creates dat directory')
//     t.ok(output.indexOf('Looking for connections') > -1, 'network')

//     st.kill()
//     return true
//   })
//   st.stderr.empty()
//   st.end()
// })

// test.onFinish(function () {
//   rimraf.sync(path.join(fixtures, '.dat'))
// })
