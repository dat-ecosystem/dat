const output = require('neat-log/output')
const stringKey = require('dat-encoding').toStr
const pretty = require('prettier-bytes')
const chalk = require('chalk')

module.exports = statusUI

function statusUI (state) {
  if (!state.dat) return 'Starting Dat program...'

  const dat = state.dat
  const stats = dat.stats.get()

  return output(`
    ${chalk.blue('dat://' + stringKey(dat.key))}
    ${stats.files} files (${pretty(stats.byteLength)})
    Version: ${chalk.bold(stats.version)}
  `)
}
