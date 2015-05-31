var pump = require('pump')
var ndjson = require('ndjson')
var usage = require('../lib/usage.js')('merge.txt')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')

module.exports = {
  name: 'merge',
  command: handleMerge,
  options: [
    {
      name: 'stdin',
      boolean: false
    }
  ]
}

function handleMerge (args) {
  if (args._.length === 0) return usage()

  var headA = args._[0]
  var headB = args._[1]
  if (!headA || !headB) return usage()

  if (args._[2] === '-') args.stdin = true

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var mergeStream = db.merge(headA, headB)
    pump(process.stdin, ndjson.parse(), mergeStream, function done (err) {
      if (err) return abort(err, args)
      console.error('Merged', headA, headB, 'into', db.head)
    })
  })
}
