var pump = require('pump')
var ndjson = require('ndjson')
var through = require('through2')
var usage = require('../lib/util/usage.js')('merge.txt')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var debug = require('debug')('dat-merge')

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
      var pipeline = []
      
      if (args.left || args.right || args.random) {
        pipeline.push(db.diff(headA, headB))
        pipeline.push(through.obj(function autoMerge (versions, enc, next) {
          var winner
          if (args.left) winner = versions[0]
          else if (args.right) winner = versions[1]
          else if (args.random) winner = versions[+(Math.random() < 0.5)]
          debug('winner', winner)
          next(null, winner)
        }))
      } else {
        pipeline.push(process.stdin)
        pipeline.push(ndjson.parse())
      }
      
      var mergeStream = db.merge(headA, headB)
      pipeline.push(mergeStream)
      
      pump(pipeline, function done (err) {
        if (err) return abort(err, args)
        console.error('Merged', headA, headB, 'into', db.head)
      })
    }
  })
}
