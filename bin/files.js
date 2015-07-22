var through = require('through2')
var pump = require('pump')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('files.txt')

module.exports = {
  name: 'files',
  command: handleFiles,
  options: [
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

function handleFiles (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    var limit = args.limit
    if (limit) {
      if (args.limit) args.limit = parseInt(limit, 10)
      if (isNaN(args.limit)) abort(new Error('invalid limit: ' + limit), args)
    }

    args.dataset = 'files'

    var stream = db.createKeyStream(args)
    var formatter = through.obj(function (obj, enc, next) {
      next(null, obj + '\n')
    })

    pump(stream, formatter, process.stdout, function (err) {
      if (err) abort(err, args, 'Error getting file list')
      db.close()
    })
  })
}
