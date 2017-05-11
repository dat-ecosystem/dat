var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var downloadUI = require('./components/download')
var importUI = require('./components/import-progress')
var networkUI = require('./components/network')
var sourcesUI = require('./components/sources')

module.exports = archiveUI

function archiveUI (state) {
  if (!state.dat) return 'Starting Dat program...'
  if (!state.writable && !state.hasContent) return 'Connecting to dat network...'

  var dat = state.dat
  var stats = dat.stats.get()
  var title = ''

  if (state.writable || state.opts.showKey) {
    title = `${chalk.blue('dat://' + stringKey(dat.key))}\n`
  }
  if (state.title) title += state.title
  else if (state.writable) title += 'Sharing dat'
  else title += 'Downloading dat'
  if (stats.version) title += `: ${stats.files} files (${pretty(stats.byteLength)})`
  if (state.http && state.http.listening) title += `\nServing files over http at http://localhost:${state.http.port}`

  return output`
    ${title}
    ${state.joinNetwork ? '\n' + networkUI(state) : ''}

    ${state.writable ? importUI(state) : downloadUI(state)}
    ${state.opts.sources ? sourcesUI(state) : ''}
    ${state.exiting ? 'Exiting the Dat program...' : chalk.dim('Ctrl+C to Exit')}
  `
}
