var fs = require('fs')
var pumpify = require('pumpify')
var pump = require('pump')
var through = require('through2')
var uuid = require('cuid')
var debug = require('debug')('bin/import')
var progress = require('../lib/progress.js')
var parseInputStream = require('../lib/parse-input-stream.js')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('import.txt')

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

  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'))

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    handleInputStream(db)
  })

  function handleInputStream (db) {
    var inputStream
    if (args._[0] === '-') inputStream = process.stdin
    else inputStream = fs.createReadStream(args._[0])
    if (!args.json) inputStream = pumpify(inputStream, progress('Wrote'))

    var transform = through.obj(function (obj, enc, next) {
      debug('heres my obj!', obj)
      var key = obj[args.key] || obj.key || uuid()
      next(null, {type: 'put', key: key, value: obj})
    })

    var writeStream = db.createWriteStream({
      message: args.message,
      dataset: args.dataset,
      transaction: true
    })

    pump(inputStream, parseInputStream(args), transform, writeStream, function done (err) {
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
