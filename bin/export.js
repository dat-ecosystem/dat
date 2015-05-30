var pump = require('pump')
var through = require('through2')
var formatData = require('format-data')
var debug = require('debug')('bin/export')
var openDat = require('../lib/open-dat.js')
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

  if (args.help || !args.dataset) {
    usage()
    abort()
  }

  var format = 'ndjson'
  if (args.format) format = args.format

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleOuputStream(db)
  })

  function handleOuputStream (db) {
    var parseOutput = through.obj(function (data, enc, next) {
      debug('exporting through data', data)
      if (data.content === 'row') {
        var row = data.value
        row.key = data.key
        return next(null, row)
      }
    })

    pump(db.createReadStream(args), parseOutput, formatData(format), process.stdout, function done (err) {
      if (err) abort(err, 'Error exporting data')
    })
  }
}
