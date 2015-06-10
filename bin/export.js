var pump = require('pump')
var debug = require('debug')('bin/export')
var Dat = require('../')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('export.txt')

module.exports = {
  name: 'export',
  command: handleExport,
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
      name: 'greater-than-equal',
      boolean: false,
      abbr: 'gte'
    },
    {
      name: 'greater-than',
      boolean: false,
      abbr: 'gt'
    },
    {
      name: 'less-than-equal',
      boolean: false,
      abbr: 'lte'
    },
    {
      name: 'less-than',
      boolean: false,
      abbr: 'lt'
    },
    {
      name: 'limit',
      boolean: false,
      abbr: 'l'
    }
  ]
}

function handleExport (args) {
  debug('handleExport', args)

  if (args.help) {
    return usage()
  }

  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'))

  args.format = args.format || 'ndjson'
  var limit = args.limit
  if (limit) {
    if (args.limit) args.limit = parseInt(limit, 10)
    if (isNaN(args.limit)) abort(new Error('invalid limit: ' + limit), args)
  }

  var dat = Dat(args)

  pump(dat.createExportStream(args), process.stdout, function done (err) {
    if (err) abort(err, args, 'Error exporting data')
  })
}
