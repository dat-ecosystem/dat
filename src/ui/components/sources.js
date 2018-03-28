var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var objectValues = require('object-values')

module.exports = peersUI

function peersUI (state) {
  if (!state.network) return ''
  if (Object.keys(state.sources).length === 0) return ''

  var peers = objectValues(state.sources)
  if (!state.opts.sources) peers = peers.filter(peer => !peer.closed)
  var info = peers.map(function (peer, i) {
    return peerUI(peer, i)
  }).join('\n')

  return `${info}`

  function peerUI (peer, i) {
    var peerInfo = `${chalk.dim(`[Peer-${i + 1}]`)} ${pretty(peer.dataTransferred)} transferred | ${pretty(peer.speed)}/s`
    if (!state.opts.sources) return output(peerInfo)
    var peerDetails = `${peer.closed ? 'CLOSED' : peer.type}: ${peer.host}:${peer.port} ${peer.error ? '\n' + peer.error : ''}`
    return output(`
      ${peerInfo}
        ${peerDetails}
    `)
  }
}
