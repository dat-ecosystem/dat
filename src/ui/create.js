var output = require('neat-log/output')
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var importUI = require('./components/import-progress')
var keyEl = require('./elements/key')
var pluralize = require('./elements/pluralize')

module.exports = createUI

function createUI (state) {
  if (!state.dat) {
    return output(`
    Creating a Dat! Add information to your dat.json file:
  `)
  }

  var dat = state.dat
  var stats = dat.stats.get()
  var title = '\n'
  var progressView
  var exitMsg = `
    Your dat is created! Run ${chalk.green('dat sync')} to share:
    ${keyEl(dat.key)}
  `
  if (!state.opts.import) {
    // set exiting right away
    state.exiting = true
  }

  if (!state.exiting) {
    // Only show key if not about to exit
    title = `${keyEl(dat.key)}\n`
  }
  if (state.title) title += state.title

  if (stats.version > 0) title += `: ${stats.files} ${pluralize('file', stats.files)} (${pretty(stats.byteLength)})`
  else if (stats.version === 0) title += ': (empty archive)'

  if (state.opts.import) {
    progressView = importUI(state) + '\n'
  } else {
    progressView = 'Not importing files.'
  }

  return output(`
    ${title}

    ${progressView}
    ${state.exiting ? exitMsg : chalk.dim('Ctrl+C to Exit')}
  `)
}
