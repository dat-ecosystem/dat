var discoveryDefaults = require('datland-swarm-defaults')
var discoverySwarm = require('discovery-swarm')
var webrtcSwarm = require('webrtc-swarm')
var rtc = require('get-browser-rtc')
var signalhub = require('signalhub')
var pump = require('pump')

module.exports = nodeSwarm

function nodeSwarm (archive) {
  var swarm = discoverySwarm(discoveryDefaults({
    id: archive.id, // do not think this is nessecary anymore actually ...
    hash: false,
    stream: function () {
      // we set this here since discovery-swarm will use .id to infer peer identity then
      return archive.replicate()
    }
  }))

  swarm.on('listening', function () {
    swarm.join(archive.discoveryKey)
  })

  swarm.on('connection', function (stream) {
    // new peer ...
  })

  swarm.once('error', function () {
    swarm.listen(0)
  })

  if (rtc()) browserSwarm(archive, swarm)

  swarm.listen(3282)

  return swarm
}

function browserSwarm (archive, discSwarm) { // experimental
  var swarm = webrtcSwarm(signalhub('dat-' + archive.discoveryKey.toString('hex'), [
    'https://signalhub.mafintosh.com' // TODO: use offical dat.land hubs instead
  ]))

  swarm.on('peer', function (connection) {
    var peer = archive.replicate()
    pump(connection, peer, connection)

    // HACK! lets now do this and use a DatSwarm prototype here instead
    // that has a .swarm, .browserSwarm property etc ... (could also manage upload/download speed + peer list)
    discSwarm.emit('browser-connection', peer)
  })

  return swarm
}
