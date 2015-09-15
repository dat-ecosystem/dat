var pump = require('pump')
var debug = require('debug')('bin/import')
var createImportStream = require('../lib/import.js')
var openDat = require('../lib/util/open-dat.js')
var createFileStream = require('../lib/util/create-file-stream.js')
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
      boolean: false,
      abbr: 'k'
    },
    {
      name: 'batch',
      boolean: false,
      abbr: 'b'
    },
    {
      name: 'deduplicate',
      boolean: true,
      default: false
    }
  ]
}

function handleImport (args) {
  debug('handleImport', args)

  if (args.help || args._.length === 0) return usage()
  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'), args)

  openDat(args, function (err, db) {
    if (err) abort(err, args)
    if (args._[0] === '-') doImport(process.stdin, db)
    else {
      createFileStream(args._[0], function (err, inputStream) {
        if (err) abort(err, args, err.message)
        doImport(inputStream, db)
      })
    }
  })

  function doImport (inputStream, db) {
    var importer = createImportStream(db, args)
    if (!args.json) progress(importer, {verb: 'Wrote', subject: 'keys'})

    pump(inputStream, importer, function done (err) {
      if (err) abort(err, args)
      if (args.json) {
        var output = {
          version: db.head
        }
        console.log(JSON.stringify(output))
      } else {
        if (importer.progress.puts === 0 && importer.progress.deletes === 0) {
          console.error('No changes were made.')
        } else {
          console.error('Done importing data. \nVersion: ' + db.head)
        }
      }

      db.close()
    })
  }
}
