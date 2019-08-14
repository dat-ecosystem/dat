const output = require('neat-log/output')
const pretty = require('prettier-bytes')
const pluralize = require('../elements/pluralize')

module.exports = networkUI

function networkUI (state) {
  const network = state.network
  const stats = state.stats

  if (!network) return ''
  const peers = stats.peers.total || 0
  // const complete = stats.peers.complete
  return output(`
    ${peers} ${pluralize('connection', peers)} ${speedUI()}
  `)

  function speedUI () {
    let output = '| '
    const speed = state.stats.network
    const upSpeed = speed.uploadSpeed || 0
    const downSpeed = speed.downloadSpeed || 0
    output += `Download ${pretty(downSpeed)}/s`
    output += ` Upload ${pretty(upSpeed)}/s `
    return output
  }
}
