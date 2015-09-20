var debug = require('debug')('bin/write')
var usage = require('../lib/util/usage.js')('write.txt')
var datAdd = require('../bin/add.js').command

module.exports = {
  name: 'write',
  command: handleWrite,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'key',
      boolean: false,
      abbr: 'k'
    },
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    }
  ]
}

function handleWrite (args) {
  debug('handleWrite', args)

  if (args.help || args._.length === 0) {
    return usage()
  }

  return datAdd(args)
}
