module.exports = {
  name: 'doctor',
  help: [
    'Call the Doctor! Runs two tests:',
    '  1. Check if you can connect to a peer on a public server.',
    '  2. Gives you a link to test direct peer connections.',
    '',
    'Usage: dat doctor [<link>]'
  ].join('\n'),
  options: [],
  command: function (opts) {
    var doctor = require('dat-doctor')

    opts.peerId = opts._[0]
    doctor(opts)
  }
}
