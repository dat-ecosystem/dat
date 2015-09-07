var usage = require('../lib/util/usage.js')('root.txt')

module.exports = {
  name: 'help',
  command: function () { return usage() },
  options: []
}
