var pump = require('pump')
var debug = require('debug')('bin/export')
var formatData = require('format-data')
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
    }
  ]
}

function handleExport (args) {
  debug('handleExport', args)

  if (args.help) {
    usage()
    abort()
  }

  if (!args.f) {
    args.f = 'ndjson'
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleOuputStream(db)
  })

  function handleOuputStream (db) {
    var outputStream = process.stdout

    pump(db.createReadStream({ dataset: args.d }), formatData(args.f), outputStream, function done (err) {
      if (err) abort(err, 'Error exporting data to', args._[0])
      console.error('Done exporting data to', args._[0])
    })
  }
}
