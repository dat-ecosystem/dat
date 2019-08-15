const chalk = require('chalk')

module.exports = function (state) {
  let warning = ''
  state.warnings.forEach(message => {
    warning += `${chalk.yellow(`Warning: ${message}`)}\n`
  })
  return warning
}
