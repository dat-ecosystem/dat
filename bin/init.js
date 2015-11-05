var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('init.txt')

module.exports = {
  name: 'init',
  command: handleInit
}

function handleInit (args) {
  if (args.help) return usage()
  throw new Error('Unimplemented')
}
