var pump = require('pump')
var knead = require('knead')
var batcher = require('byte-stream')
var through = require('through2')

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

    var resolutionStream

    if (args.live) {
      resolutionStream = process.stdin
    } else {
      var diffStream = db.createDiffStream(headA, headB)

      var limit = 20 * 2 // rows * 2 (to include diffs)
      var batchStream = batcher(limit)
      var opts = {
        rowPath: function (row) { return row.value }
      }
      resolutionStream = diffStream.pipe(batchStream).pipe(knead(opts))
      resolutionStream.on('data', function (data) {
        console.log('resolutionStream', data)
      })
    }

    pump(resolutionStream, mergeStream, function done (err) {
      if (err) return abort(err)
      console.error('Merged', headA, headB, 'into', db.head)
    })
  })
}

