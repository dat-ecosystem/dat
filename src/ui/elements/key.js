var stringKey = require('dat-encoding').toStr
var chalk = require('chalk')

module.exports = function (key) {
  return `${chalk.blue(`dat://${stringKey(key)}`)}`
}
