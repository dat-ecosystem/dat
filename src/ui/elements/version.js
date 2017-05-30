var chalk = require('chalk')

module.exports = function (version) {
  return `${chalk.green(`dat v${version}`)}`
}
