var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('clone.txt')
var authPrompt = require('../lib/util/auth-prompt.js')

var clone = require('../lib/clone.js')

module.exports = {
  name: 'clone',
  command: handleClone,
  options: [
    {
      name: 'username',
      boolean: false,
      abbr: 'u'
    },
    {
      name: 'password',
      boolean: false,
      abbr: 'p'
    }
  ]
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var source = args._[0]
  var path = args._[1] || getName(source)

  throw new Error('Unimplemented')
}

function getName (source) {
  return source
    .replace(/\.dat$/i, '').replace(/[^\-._a-z0-9]+$/i, '')
    .split(/[^\-._a-z0-9]/i).pop() || 'dat-' + Date.now()
}
