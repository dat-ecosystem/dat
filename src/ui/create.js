const output = require('neat-log/output')
const pretty = require('prettier-bytes')
const chalk = require('chalk')
const importUI = require('./components/import-progress')
const keyEl = require('./elements/key')
const pluralize = require('./elements/pluralize')

module.exports = createUI

function createUI (state) {
  if (!state.dat) {
    return output(`
    Creating a Dat! Add information to your dat.json file:
  `)
  }

  const dat = state.dat
  const stats = dat.stats.get()
  let title = '\n'
  let progressView
  const exitMsg = `
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
