var pump = require('pump')
var ndjson = require('ndjson')
var diffs2string = require('diffs-to-string')
var through = require('through2')
var batcher = require('byte-stream')
var manualMergeStream = require('manual-merge-stream')
var vizOpts = require('../lib/util/diff-viz-opts.js')
var createDiffStream = require('../lib/diff.js')
var usage = require('../lib/util/usage.js')('merge.txt')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')

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

      if (args.stdin) pump(process.stdin, ndjson.parse(), mergeStream, done)
      else {
        var diffs = createDiffStream(db, headA, headB)
        var formatter = through.obj(function (diff, enc, next) {
          next(null, diff.versions)
        })
        var opts = {
          vizFn: function (changes) {
            return diffs2string(changes, vizOpts)
          }
        }

        pump(diffs, formatter, batcher(args.limit), manualMergeStream(opts), mergeStream, done)
      }

      function done (err) {
        if (err) return abort(err, args)
        if (args.json) console.log(JSON.stringify({version: db.head}))
        else console.error('Current version is', db.head)
      }
    }
  })
}
