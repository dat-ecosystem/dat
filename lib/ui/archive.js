var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var importUI = require('./components/import-progress')
var networkUI = require('./components/network')

module.exports = shareUI

function shareUI (state) {
  if (!state.dat) return output`Starting Dat...`
  if (!state.writable && !state.hasContent) return 'Searching network for dat archive...'

  var dat = state.dat
  var stats = dat.stats.get()

  var title = `${state.title || 'Downloading'} Archive: ${stats.filesTotal} files (${pretty(stats.bytesTotal)})`
  if (state.writable) {
    title = output`
      Sharing: ${stats.filesTotal} files (${pretty(stats.bytesTotal)})
      dat://${stringKey(dat.key)}
    `
  }

  return output`
    ${title}

    ${importUI(state)}
    ${state.joinNetwork ? '\n' + networkUI(state) : ''}
  `
}
