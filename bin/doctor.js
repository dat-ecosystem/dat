var dns = require('dns-discovery')
var swarm = require('discovery-swarm')
var crypto = require('crypto')
var pump = require('pump')
var dat = require('../index.js')

module.exports = function (args) {
  var client = dns({
    servers: dat.DNS_SERVERS
  })

  var tick = 0
  var id = typeof args.doctor === 'string' ? args.doctor : crypto.randomBytes(32).toString('hex')
  var sw = swarm({
    dns: {
      servers: dat.DNS_SERVERS
    }
  })

  sw.on('error', function () {
    sw.listen(0)
  })
  sw.listen(typeof args.port === 'number' ? args.port : 3282)
  sw.on('listening', function () {
    client.whoami(function (err, me) {
      if (err) return console.error('Could not detect public ip / port')
      console.log('Public IP: ' + me.host)
      console.log('Your public port was ' + (me.port ? 'consistent' : 'inconsistent') + ' across remote multiple hosts')
      if (!me.port) console.log('Looks like you are behind a symmetric nat. Try enabling upnp.')
      else console.log('Looks like you can accept incoming p2p connections.')
      client.destroy()
      sw.join(id)
      sw.on('connecting', function (peer) {
        console.log('[info] Trying to connect to %s:%d', peer.host, peer.port)
      })
      sw.on('peer', function (peer) {
        console.log('[info] Discovered %s:%d', peer.host, peer.port)
      })
      sw.on('connection', function (connection) {
        var num = tick++
        var prefix = '0000'.slice(0, -num.toString().length) + num

        var data = crypto.randomBytes(16).toString('hex')
        console.log('[%s] Connection established to remote peer', prefix)
        var buf = ''
        connection.setEncoding('utf-8')
        connection.write(data)
        connection.on('data', function (remote) {
          buf += remote
          if (buf.length === data.length) {
            console.log('[%s] Remote peer echoed expected data back', prefix)
          }
        })
        pump(connection, connection, function () {
          console.log('[%s] Connected closed', prefix)
        })
      })

      console.log('')
      console.log('To test p2p connectivity login to another computer and run:')
      console.log('')
      console.log('  dat --doctor=' + id)
      console.log('')
      console.log('Waiting for incoming connections... (local port: %d)', sw.address().port)
      console.log('')
    })
  })
}
