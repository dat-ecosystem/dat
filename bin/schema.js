var debug = require('debug')('bin/import')
var basename = require('path').basename

var schemaSync = require('../lib/schema.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('schema.txt')
var datWrite = require('../bin/write.js').command
var datRead = require('../bin/read.js').command

module.exports = {
  name: 'schema',
  command: handleSchema,
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

function handleSchema (args) {
  debug('handleSchema', args)

  if (args.help) return usage()
  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'), args)

  var path = args._[0]

  if (!args.key) args.key = basename(path)
  if (!args.message) args.message = 'Added ' + args.key + ' schema for dataset ' + args.dataset + '.'

  if (!path) {
    args._[0] = schemaSync.get(args)
    return datRead(args)
  }

  schemaSync.put(args)
  return datWrite(args)
}
