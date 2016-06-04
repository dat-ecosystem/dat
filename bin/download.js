var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var each = require('stream-each')
var raf = require('random-access-file')
var replicate = require('../lib/replicate')

module.exports = function (argv) {
  var key = argv._[0]
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive(Buffer(key, 'hex'), {
    file: function (name) {
      return raf(name)
    }
  })

  var swarm = replicate(archive)

  swarm.on('connection', function (con) {
    console.log('Connected to remote peer')
    con.on('close', function () {
      console.log('Disconnected from remote peer')
    })
  })
  swarm.on('browser-connection', function (con) {
    console.log('WebRTC browser connected')
    con.on('close', function () {
      console.log('WebRTC browser disconnected')
    })
  })

  each(archive.list({live: argv.live}), function (data, next) {
    console.log('Downloading', data.name)
    archive.download(data, function (err) {
      if (err) return onerror(err)
      console.log('Download of', data.name, 'finished')
      next()
    })
  }, function () {
    console.log('All files downloaded.')
    process.exit(0)
  })

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
