var url = require('url')
var openDat = require('../lib/open-dat.js')
var sshStream = require('../lib/ssh-stream.js')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
  if (args._.length === 0) abort(new Error('Must pass an argument to dat pull'))
  var remote = args._[0]
  var parsed = url.parse(remote)
  if (!parsed.protocol) abort(new Error('Invalid pull URL'))
  if (parsed.protocol !== 'ssh:') abort(new Error('Invalid pull URL'))

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    var ssh = sshStream(remote)
    var pullStream = db.pull()
    ssh.pipe(pullStream).pipe(ssh)
  })
}

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}
