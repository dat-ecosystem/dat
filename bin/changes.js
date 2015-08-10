var ndjson = require('ndjson')
var pump = require('pump')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('changes.txt')

module.exports = {
  name: 'changes',
  command: doChanges,
  options: [
  ]
}

function doChanges (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    args.values = true

    pump(db.createChangesStream(args), ndjson.serialize(), process.stdout, function (err) {
      if (err) abort(err, args)
    })
  })
}
