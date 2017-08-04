var chalk = require('chalk')

module.exports = function (state) {
  var warning = ''
  state.warnings.forEach(function (message) {
    warning += `${chalk.yellow(`Warning: ${message}`)}\n`
  })
  return warning
}
