var fs = require('fs')
var path = require('path')
var url = require('url')
var openDat = require('../lib/open-dat.js')
var sshStream = require('../lib/ssh-stream.js')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
  if (args._.length === 0) return usage()
  var remote = args._[0]
  var parsed = url.parse(remote)
  if (!parsed.protocol) return usage()
  if (parsed.protocol !== 'ssh:') return usage()

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

function usage () {
  console.error(fs.readFileSync(path.join(__dirname, '..', 'usage', 'pull.txt')).toString())
}
