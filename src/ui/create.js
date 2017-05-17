var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')
var importUI = require('./components/import-progress')

module.exports = createUI

function createUI (state) {
  if (!state.dat) {
    return output`
    Creating a Dat! Add information to your dat.json file:
  `
  }

  var dat = state.dat
  var stats = dat.stats.get()
  var title = ''
  var progressView
  var exitMsg = `
    Your dat is created! Run ${chalk.green('dat sync')} to share:
    ${chalk.blue('dat://' + stringKey(dat.key))}
  `

  if (state.writable || state.opts.showKey) {
    title = `${chalk.blue('dat://' + stringKey(dat.key))}\n`
  }
  if (state.title) title += state.title

  if (stats.version > 0) title += `: ${stats.files} ${pluralize('file', stats.files)} (${pretty(stats.byteLength)})`
  else if (stats.version === 0) title += ': (empty archive)'

  if (state.opts.import) {
    progressView = importUI(state)
  } else {
    state.exiting = true
    progressView = 'Not importing files.'
  }
  return output`
    ${title}

    ${progressView}

    ${state.exiting ? exitMsg : chalk.dim('Ctrl+C to Exit')}
  `

  function pluralize (str, val) {
    return `${str}${val === 1 ? '' : 's'}`
  }
}
