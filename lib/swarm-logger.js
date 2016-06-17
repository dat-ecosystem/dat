var chalk = require('chalk')

module.exports = swarmLogger

function swarmLogger (swarm, logger, msg) {
  var message = msg + ', waiting for connections...'
  logger.status(message, 3)
  updatePeers()

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
    if (activePeers > 0) message = msg + ', connected to ' + chalk.bold(count) + ' sources'
    else message = msg + ', waiting for connections...'
    logger.status(message, 3)
  }
}
