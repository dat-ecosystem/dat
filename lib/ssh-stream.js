var duplex = require('duplexify')
var child = require('child_process')

module.exports = function SSHStream (remote) {
  var bareRemote = remote.slice(6)
  var parts = bareRemote.split(':')
  if (parts.length === 1) abort(new Error('Must specify path in URL'))
  var datPath = parts.pop()
  bareRemote = parts.join(':')
  var hostOverrides = ['-o', 'UserKnownHostsFile=/dev/null', '-o', 'StrictHostKeyChecking=no']
  var sshArgs = [bareRemote, 'PATH=/usr/local/bin:$PATH; dat-beta receive-replication --path=' + JSON.stringify(datPath)]
  var ssh = child.spawn('ssh', hostOverrides.concat(sshArgs))
  var duplexSSH = duplex(ssh.stdin, ssh.stdout)
  duplexSSH.childProcess = ssh
  return duplexSSH
}

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}
