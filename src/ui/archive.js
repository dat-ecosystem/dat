const path = require('path')
const output = require('neat-log/output')
const pretty = require('prettier-bytes')
const chalk = require('chalk')
const downloadUI = require('./components/download')
const importUI = require('./components/import-progress')
const warningsUI = require('./components/warnings')
const networkUI = require('./components/network')
const sourcesUI = require('./components/sources')
const keyEl = require('./elements/key')
const pluralize = require('./elements/pluralize')
const version = require('./elements/version')
const pkg = require('../../package.json')

module.exports = archiveUI

function archiveUI (state) {
  if (!state.dat) return 'Starting Dat program...'
  if (!state.writable && !state.hasContent) return 'Connecting to dat network...'
  if (!state.warnings) state.warnings = []

  const dat = state.dat
  const stats = dat.stats.get()
  let title = (state.dat.resumed) ? '' : `Created new dat in ${dat.path}${path.sep}.dat\n`
  let progressView

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
