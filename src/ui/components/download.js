var output = require('neat-log/output')
var bar = require('progress-string')

module.exports = networkUI

function networkUI (state) {
  var stats = state.stats.get()
  var download = state.download
  if (!stats || !download) return ''
  if (!stats.downloaded || !stats.length) {
    return '' // no metadata yet
  }

  var title = 'Downloading updates...'
  var downBar = makeBar()

  if (download.nsync) {
    if (state.opts.exit && download.modified) return `dat sync complete.\nVersion ${stats.version}`

    if (!download.modified) {
      if (state.opts.exit) title = `dat already in sync, waiting for updates.`
      else title = `dat synced, waiting for updates.`
    }
  }

  return output`
    ${title}
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
