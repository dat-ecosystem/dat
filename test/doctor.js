// var path = require('path')
// var test = require('tape')
// var spawn = require('./helpers/spawn.js')
// var help = require('./helpers')
//

// TODO
// dat-doctor requires interactive testing right now...

// var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))

// test('misc - doctor option works ', function (t) {
//   var st = spawn(t, dat + ' doctor', {end: false})
//   st.stderr.match(function (output) {
//     var readyPeer = output.indexOf('Waiting for incoming connections') > -1
//     if (!readyPeer) return false

//     if (!process.env.TRAVIS) {
//       // Not working on v4/v7 travis but can't reproduce locally
//       t.ok(output.indexOf('UTP') > -1, 'doctor connects to public peer via UTP')
//     }
//     t.ok(output.indexOf('TCP') > -1, 'doctor connects to public peer via TCP')

//     var key = help.matchLink(output)
//     startPhysiciansAssistant(key)
//     return true
//   }, 'doctor started')

//   function startPhysiciansAssistant (link) {
//     var assist = spawn(t, dat + ' doctor ' + link, {end: false})
//     assist.stderr.match(function (output) {
//       var readyPeer = output.indexOf('Waiting for incoming connections') > -1
//       if (!readyPeer) return false

//       t.same(help.matchLink(output), link, 'key of peer matches')
//       t.ok(readyPeer, 'starts looking for peers')
//       t.skip(output.indexOf('Remote peer echoed expected data back') > -1, 'echo data back')
//       st.kill()
//       return true
//     })
//     assist.end(function () {
//       t.end()
//     })
//   }
// })
