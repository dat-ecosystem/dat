var pump = require('pump')
var through = require('through2')
var ndjson = require('ndjson')
var debug = require('debug')('bin/versions')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('versions.txt')

module.exports = {
  name: 'versions',
  command: handleVersions,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handleVersions (args) {
  debug('handleVersions', args)

  if (args.help) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleReadStream(db)
  })

  function handleReadStream (db) {
    var opts = {
      dataset: args.d
    }

    pump(db.createChangesStream(opts), ndjson.serialize(), process.stdout, function done (err) {
      if (err) abort(err, 'dat: err in versions')
    })
  }
}
