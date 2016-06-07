var chalk = require('chalk')

module.exports = swarmLogger

function swarmLogger (swarm, logger) {
  swarm.on('connection', function (con) {
    updatePeers()
    con.on('close', function () {
      updatePeers()
    })
  })

  swarm.on('browser-connection', function (con) {
    updatePeers()
    con.on('close', function () {
      updatePeers()
    })
  })

  function updatePeers () {
    var count = '0'
    var activePeers = swarm.connections.length
    var totalPeers = swarm.connecting + swarm.connections.length
    if (activePeers > 0) count = activePeers + '/' + totalPeers
    var msg = chalk.blue.bold('[Status] ') + 'Connected to ' + chalk.bold(count) + ' sources'
    logger.status(msg, -1)
  }
}