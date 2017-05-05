var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var downloadUI = require('./components/download')
var importUI = require('./components/import-progress')
var networkUI = require('./components/network')

module.exports = shareUI

function shareUI (state) {
  if (!state.dat) return 'Starting Dat program...'
  if (!state.writable && !state.hasContent) return 'Searching network for dat archive.'

  var dat = state.dat
  var stats = dat.stats.get()
  var title

  if (state.writable) {
    title = output`
      ${chalk.blue('dat://' + stringKey(dat.key))}
      ${state.title || 'Sharing'} dat
    `
  } else {
    title = `${state.title || 'Downloading'} dat`
  }
  if (stats.version) title += `: ${stats.files} files (${pretty(stats.byteLength)})`

  return output`
    ${title}
    ${state.joinNetwork ? '\n' + networkUI(state) : ''}

    ${state.writable ? importUI(state) : downloadUI(state)}

    ${state.exiting ? 'Exiting the Dat program...' : chalk.dim('Ctrl+C to Exit')}
  `
}
