var pump = require('pump')
var pumpify = require('pumpify')
var ndjson = require('ndjson')
var diffs2string = require('diffs-to-string')
var through = require('through2')
var batcher = require('byte-stream')
var manualMergeStream = require('manual-merge-stream')

var checkout = require('../lib/checkout.js')
var diffOpts = require('../lib/util/diff-viz-opts.js')
var usage = require('../lib/util/usage.js')('merge.txt')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var debug = require('debug')('bin/merge')

module.exports = {
  name: 'merge',
  command: handleMerge,
  options: [
    {
      name: 'stdin',
      boolean: false
    },
    {
      name: 'message',
      boolean: false
    },
    {
      name: 'limit',
      boolean: false,
      default: 5
    },
    {
      name: 'left',
      boolean: true
    },
    {
      name: 'right',
      boolean: true
    },
    {
      name: 'random',
      boolean: true
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
      if (headA === headB) {
        abort(new Error('These forks are the same. No merge performed.'))
      }
      var mergeStream = db.merge(headA, headB, {message: args.message})
      var resStream = resolutionStream(headA, headB)
      pump(resStream, mergeStream, function done (err) {
        if (err) return abort(err, args)
        if (args._.indexOf(db.head) > -1) db = checkout(db, mergeStream.head)
        if (args.json) console.error(JSON.stringify({heads: [headA, headB], fork: mergeStream.head}))
        else console.error('Merged successfully.\nCurrent version is', db.head)
        db.close()
      })
    }

    function resolutionStream (headA, headB) {
      if (args.stdin) return pumpify.obj(process.stdin, ndjson.parse())

      var pipeline = []

      pipeline.push(db.diff(headA, headB))

      if (args.left || args.right || args.random) {
        var choice = 0 // left
        if (args.right) choice = 1
        if (args.random) choice = +(Math.random() < 0.5)
        pipeline.push(through.obj(function (versions, enc, next) {
          var winner = versions[choice]
          debug('versions', versions)
          debug('winner', winner)
          next(null, winner)
        }))
      } else { // manual
        pipeline.push(batcher(args.limit))
        pipeline.push(manualMergeStream({vizFn: vizFn}))
      }
      return pumpify.obj(pipeline)
    }
  })
}

function vizFn (changes) {
  return diffs2string(changes, diffOpts)
}
