var pump = require('pump')
var ndjson = require('ndjson')
var debug = require('debug')('bin/get')
var formatData = require('format-data')
var through = require('through2')

var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('get.txt')
var abort = require('../lib/abort.js')

module.exports = {
  name: 'get',
  command: handleRows,
  options: [
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    },
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
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

function handleRows (args) {
  debug('handleRows', args)
  if (args.help) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    var key = args._[0]
    if (!args.f) args.f = 'ndjson'
    if (args.f === 'json') args.f = 'ndjson'

    var parseReadStream
    if (args.f === 'ndjson') parseReadStream = ndjson.serialize()
    else {
      parseReadStream = through.obj(function (data, enc, next) {
        var val = data.value
        val.key = data.key
        next(null, val)
      })
    }

    if (!key) {
      pump(db.createReadStream(args), parseReadStream, formatData(args.f), process.stdout, function done (err) {
        if (err) abort(err, 'dat get error')
      })
    } else {
      db.get(key, args, function (err, value) {
        if (err) abort(err, 'dat get error')
        process.stdout.write(JSON.stringify(value))
      })
    }
  })
}
