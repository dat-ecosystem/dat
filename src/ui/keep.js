var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')

module.exports = statusUI

function statusUI (state) {
  if (!state.dat) return 'Starting Dat program...'
  if (state.importing) return 'importing files...'
  if (state.history) {
    return output`
      ${chalk.blue('dat://' + stringKey(state.dat.key))}
      Dat saved to local history.
      Version: ${state.dat.version}
    `
  }

  return output`
    ${chalk.blue('dat://' + stringKey(state.dat.key))}
    keeping dat stuff...
  `
}
