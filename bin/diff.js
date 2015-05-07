var pump = require('pump')
var through = require('through2')
var ndjson = require('ndjson')
var diffStream = require('sorted-diff-stream')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('diff.txt')

module.exports = {
  name: 'diff',
  command: handleDiff
}

function handleDiff (args) {
  if (args.help) return usage()
  if (args._.length < 2) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)

    var diffs = db.createDiffStream(args._[0], args._[1])
    pump(diffs, ndjson.serialize(), process.stdout, function done (err) {
      if (err) throw err
    })
  })
}
