var fs = require('fs')
var pump = require('pump')
var pumpify = require('pumpify')
var debug = require('debug')('bin/import')
var createImportStream = require('../lib/import.js')
var openDat = require('../lib/util/open-dat.js')
var progress = require('../lib/util/progress.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('import.txt')

module.exports = {
  name: 'import',
  command: handleImport,
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
      boolean: true,
      abbr: 'k'
    }
  ]
}

function handleImport (args) {
  debug('handleImport', args)

  if (args.help || args._.length === 0) {
    return usage()
  }

  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'), args)

  openDat(args, function (err, db) {
    if (err) abort(err, args)
    doImport(db)
  })

  function doImport (db) {
    var inputStream
    if (args._[0] === '-') inputStream = process.stdin
    else inputStream = fs.createReadStream(args._[0])
    if (!args.json) inputStream = pumpify(inputStream, progress('Wrote'))

    pump(inputStream, createImportStream(db, args), function done (err) {
      if (err) abort(err, args, 'Error importing data')
      if (args.json) {
        var output = {
          version: db.head
        }
        console.log(JSON.stringify(output))
      } else console.error('Done importing data')
    })
  }
}
