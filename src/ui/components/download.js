var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var bar = require('progress-string')

module.exports = networkUI

function networkUI (state) {
  var stats = state.stats.get()
  var download = state.download

  if (!stats || !download) return ''
  if (download.nsync) {
    return output`

      Archive up to date.
      ${state.opts.live ? 'Waiting for changes...' : ''}
    `
  }
  var stats = state.stats.get()
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
