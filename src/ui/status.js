var output = require('neat-log/output')
var stringKey = require('dat-encoding').toStr
var pretty = require('prettier-bytes')
var chalk = require('chalk')

module.exports = statusUI

function statusUI (state) {
  if (!state.dat) return 'Starting Dat program...'

  var dat = state.dat
  var stats = dat.stats.get()

  return output(`
    ${chalk.blue('dat://' + stringKey(dat.key))}
    ${stats.files} files (${pretty(stats.byteLength)})
    Version: ${chalk.bold(stats.version)}
  `)
}
