const stringKey = require('dat-encoding').toStr
const chalk = require('chalk')

module.exports = function (key) {
  return `${chalk.blue(`dat://${stringKey(key)}`)}`
}
