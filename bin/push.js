var url = require('url')
var usage = require('../lib/usage.js')('push.txt')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var sshStream = require('../lib/ssh-stream.js')

module.exports = {
  name: 'push',
  command: handlePush
}

function handlePush (args) {
  if (args._.length === 0) return usage()
  var remote = args._[0]
  var parsed = url.parse(remote)
  if (!parsed.protocol) return usage()
  if (parsed.protocol !== 'ssh:') return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    var ssh = sshStream(remote)
    var pushStream = db.push()
    ssh.pipe(pushStream).pipe(ssh)
  })
}
