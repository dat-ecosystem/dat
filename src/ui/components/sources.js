const output = require('neat-log/output')
const pretty = require('prettier-bytes')
const makeBar = require('progress-string')

module.exports = peersUI

function peersUI (state) {
  if (!state.network) return ''
  if (Object.keys(state.sources).length === 0) return ''

  const peers = state.sources
  // const stats = state.stats
  // const peerCount = stats.peers.total || 0
  // const complete = stats.peers.complete
  const info = Object.keys(peers).map(function (id, i) {
    return peerUI(peers[id], i)
  }).join('\n')

  return `\n${info}\n`

  function peerUI (peer, i) {
    const progress = peer.getProgress()
    const bar = makeBar({
      total: 100,
      style: function (a, b) {
        return `[${a}${b}] ${(progress).toFixed(2)}%`
      }
    })
    const theBar = progress ? bar(progress) : '' // progress bar todo
    return output(`
      [${i}] ${peer.closed ? 'CLOSED' : peer.type}: ${peer.host}:${peer.port} ${pretty(peer.speed)}/s
      ${peer.error ? peer.error : theBar}
    `)
  }
}
