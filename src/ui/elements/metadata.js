var chalk = require('chalk')

module.exports = function (metadata) {
  return `${chalk.magenta(`${metadata.title || 'No title'}`)}
    ${chalk.dim(`${metadata.description || 'No description'}`)}`
}
