var debug = require('debug')('bin/get')
var pump = require('pump')

var createExportStream = require('../lib/export.js')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('get.txt')

module.exports = {
  name: 'get',
  command: handleGet,
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
    }
  ]
}

function handleGet (args) {
  debug('handleGet', args)
  args.key = args.key || args._[0]

  if (args.help) return usage()
  if (!args.key && !args.dataset) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    if (!args.dataset) return datRead(db)
    if (!args.key) return datExport(db)

    db.get(args.key, args, function (err, value) {
      if (err) {
        var msg = 'Error: Could not find key ' + args.key + ' in dataset ' + args.dataset + '.'
        abort(err, args, msg)
      }
      process.stdout.write(JSON.stringify(value))
      db.close()
    })
  })

  function datRead (db) {
    var opts = {
      dataset: 'files'
    }

    debug(args.key, opts)

    var stream = db.createFileReadStream(args.key, opts)
    pump(stream, process.stdout, function done (err) {
      if (err) abort(err, args, 'Could not find file with key ' + args.key + ' is it in a dataset?')
    })

    stream.on('end', function () { db.close() })
  }

  function datExport (db) {
    var exportStream = createExportStream(db, args)

    pump(exportStream, process.stdout, function done (err) {
      if (err) abort(err, args)
    })

    exportStream.on('end', function () { db.close() })
  }
}
