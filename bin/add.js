var debug = require('debug')('bin/import')
var usage = require('../lib/util/usage.js')('add.txt')
var datImport = require('../bin/import.js').command
var datWrite = require('../bin/write.js').command

module.exports = {
  name: 'add',
  command: handleAdd,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    },
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    },
    {
      name: 'key',
      boolean: false,
      abbr: 'k'
    }
  ]
}

function handleAdd (args) {
  debug('handleAdd', args)
  if (args.help || args._.length === 0) return usage()
  args.flag = true // for importing data with implicit deletes
  if (args.dataset) datImport(args)
  else datWrite(args)
}
