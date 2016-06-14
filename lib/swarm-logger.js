var chalk = require('chalk')

module.exports = swarmLogger

function swarmLogger (swarm, logger) {
  swarm.on('connection', function (peer) {
    updatePeers()
    // TODO: if (peer.type === 'webrtc-swarm')
    peer.on('close', function () {
      updatePeers()
    })
  })

  function updatePeers () {
    var count = '0'
    var activePeers = swarm.connections
    var totalPeers = swarm.node.totalConnections // TODO: browser connections
    if (activePeers > 0) count = activePeers + '/' + totalPeers
    var msg = chalk.blue('  Connected to ' + chalk.bold(count) + ' peers')
    logger.status(msg, -1)
  }
}
