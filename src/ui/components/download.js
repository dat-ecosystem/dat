var output = require('neat-log/output')
var bar = require('progress-string')

module.exports = networkUI

function networkUI (state) {
  var stats = state.stats.get()
  var download = state.download

  if (!stats || !download) return ''
  if (download.nsync) {
    if (!state.opts.exit) return 'Ready to sync updates.'
    if (!download.modified) return 'Archive synced to latest, waiting for changes.'
    return `Archive synced, version ${stats.version}.`
  }
  if (!stats.downloaded || !stats.length) {
    return '' // no metadata yet
  }
  var downBar = makeBar()
  return output`
    ${downBar(stats.downloaded)}
  `

  function makeBar () {
    var total = stats.length
    return bar({
      total: total,
      style: function (a, b) {
        return `[${a}${b}] ${(100 * stats.downloaded / total).toFixed(2)}%`
      }
    })
  }
}
