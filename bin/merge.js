var pump = require('pump')
var usage = require('../lib/usage.js')('merge.txt')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')

module.exports = {
  name: 'merge',
  command: handleMerge
}

function handleMerge (args) {
  if (args._.length === 0) return usage()

  var headA = args._[0]
  var headB = args._[1]
  if (!headA || !headB) return usage()

  openDat(args, function ready (err, db) {
    if (err) return abort(err)
    var mergeStream = db.merge(headA, headB)
    pump(process.stdin, mergeStream, function done (err) {
      if (err) return abort(err)
      console.error('Merged', headA, headB, 'into', db.head)
    })
  })
}
