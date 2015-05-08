var pump = require('pump')
var ndjson = require('ndjson')

var debug = require('debug')('bin/cat')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('cat.txt')

module.exports = {
  name: 'cat',
  command: handleCat,
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
      name: 'greater-than',
      boolean: false,
      abbr: 'gt'
    },
    {
      name: 'less-than',
      boolean: false,
      abbr: 'lt'
    }
  ]
}

function handleCat (args) {
  if (args.help) return usage()
  openDat(args, function ready (err, db) {
    if (err) abort(err)

    var readStream = db.createReadStream({dataset: args.d, gt: args.gt, lt: args.lt})

    pump(readStream, ndjson.serialize(), process.stdout, function done (err) {
      if (err) abort(err, 'dat: cat error')
    })
  })
}
