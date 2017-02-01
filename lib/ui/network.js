var prettyBytes = require('pretty-bytes')

module.exports = function (peers, stats) {
  if (!peers) return ['Looking for connections in Dat Network...']
  var msg = []
  msg.push(`${peers} ${peers === 1 ? 'peer' : 'peers'} on the Dat Network`)
  var spdMsg = ''
  if (stats.downloadSpeed) spdMsg += `Downloading: ${prettyBytes(stats.downloadSpeed)}/s` + '  '
  if (stats.uploadSpeed) spdMsg += `Uploading: ${prettyBytes(stats.uploadSpeed)}/s`
  msg.push(spdMsg)
  return msg
}
