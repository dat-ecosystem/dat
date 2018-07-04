var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var makeBar = require('progress-string')

module.exports = peersUI

function peersUI (state) {
  if (!state.network) return ''
  if (Object.keys(state.sources).length === 0) return ''

  var peers = state.sources
  // var stats = state.stats
  // var peerCount = stats.peers.total || 0
  // var complete = stats.peers.complete
  var info = Object.keys(peers).map(function (id, i) {
    return peerUI(peers[id], i)
  }).join('\n')

  return `\n${info}\n`

  function peerUI (peer, i) {
    var progress = peer.getProgress()
    var bar = makeBar({
      total: 100,
      style: function (a, b) {
        return `[${a}${b}] ${(progress).toFixed(2)}%`
      }
    })
    var theBar = progress ? bar(progress) : '' // progress bar todo
    return output(`
      [${i}] ${peer.closed ? 'CLOSED' : peer.type}: ${peer.host}:${peer.port} ${pretty(peer.speed)}/s
      ${peer.error ? peer.error : theBar}
    `)
  }
}
