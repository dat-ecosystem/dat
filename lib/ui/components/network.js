var output = require('neat-log/output')
var pretty = require('prettier-bytes')

module.exports = networkUI

function networkUI (state) {
  var network = state.network
  var stats = state.stats

  if (!network) return ''
  if (!network.connected) {
    if (state.dat.writable) return 'Waiting for Connections...'
    return 'Searching for archive in network...'
  }
  var peers = stats.peers.total
  return output`
    ${peers} ${pluralize('source', peers)}
    ${speedUI()}
  `

  function speedUI () {
    var speed = state.stats.network
    if (!speed) return ''
    var output = ''
    if (speed.uploadSpeed) output += `Uploading ${pretty(speed.uploadSpeed)}/s`
    if (speed.downloadSpeed) output += `Downloading ${pretty(speed.downloadSpeed)}/s`
    return output
  }

  function pluralize (str, val) {
    return `${str}${val === 1 ? '' : 's'}`
  }
}
