var path = require('path')
var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var downloadUI = require('./components/download')
var importUI = require('./components/import-progress')
var warningsUI = require('./components/warnings')
var networkUI = require('./components/network')
var sourcesUI = require('./components/sources')
var keyEl = require('./elements/key')
var pluralize = require('./elements/pluralize')
var version = require('./elements/version')
var pkg = require('../../package.json')

module.exports = archiveUI

function archiveUI (state) {
  if (!state.dat) return 'Starting Dat program...'
  if (!state.writable && !state.hasContent) return 'Connecting to dat network...'
  if (!state.warnings) state.warnings = []

  var dat = state.dat
  var stats = dat.stats.get()
  var title = (state.dat.resumed) ? '' : `Created new dat in ${dat.path}${path.sep}.dat\n`
  var progressView

  if (state.writable || state.opts.showKey) {
    title += `${keyEl(dat.key)}\n`
  }
  if (state.title) title += state.title
  else if (state.writable) title += 'Sharing dat'
  else title += 'Downloading dat'
  if (state.opts.sparse) title += `: ${state.opts.selectedFiles.length} ${pluralize('file', state.opts.selectedFiles.length)} (${pretty(state.selectedByteLength)})`
  else if (stats.version > 0) title += `: ${stats.files} ${pluralize('file', stats.file)} (${pretty(stats.byteLength)})`
  else if (stats.version === 0) title += ': (empty archive)'
  if (state.http && state.http.listening) title += `\nServing files over http at http://localhost:${state.http.port}`

  if (!state.writable) {
    progressView = downloadUI(state)
  } else {
    if (state.opts.import) {
      progressView = importUI(state)
    } else {
      progressView = 'Not importing files.' // TODO: ?
    }
  }

  return output(`
    ${version(pkg.version)}
    ${title}
    ${state.joinNetwork ? '\n' + networkUI(state) : ''}

    ${progressView}
    ${state.opts.sources ? sourcesUI(state) : ''}
    ${state.warnings ? warningsUI(state) : ''}
    ${state.exiting ? 'Exiting the Dat program...' : chalk.dim('Ctrl+C to Exit')}
  `)
}
