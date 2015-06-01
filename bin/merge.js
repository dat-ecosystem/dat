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
  if (args._.length < 1) return usage()
  if (args._[args._.length - 1] === '-') {
    args.stdin = true
    args._.pop()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)

    if (args._.length === 2) return merge(args._[0], args._[1])

    db.status(function (err, status) {
      if (err) abort(err, args)
      merge(status.head, args._[0])
    })

    function merge (headA, headB) {
      var mergeStream = db.merge(headA, headB)
      pump(process.stdin, ndjson.parse(), mergeStream, function done (err) {
        if (err) return abort(err, args)
        console.error('Merged', headA, headB, 'into', db.head)
      })
    }
  })
}
