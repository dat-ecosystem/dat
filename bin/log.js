var pump = require('pump')
var ndjson = require('ndjson')
var debug = require('debug')('bin/versions')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)

  if (args.help) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    handleReadStream(db)
  })

  function handleReadStream (db) {
    pump(db.createChangesStream(args), ndjson.serialize(), process.stdout, function done (err) {
      if (err) abort(err, args, 'dat: err in versions')
    })
  }
}
