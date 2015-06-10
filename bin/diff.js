var pump = require('pump')
var pumpify = require('pumpify')
var through = require('through2')
var ndjson = require('ndjson')
var openDat = require('../lib/util/open-dat.js')
var diffToString = require('diffs-to-string').stream
var createDiffStream = require('../lib/diff.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('diff.txt')

module.exports = {
  name: 'diff',
  command: handleDiff,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handleDiff (args) {
  if (args.help) return usage()
  if (args._.length < 1) return usage()

  if (args._.length === 2) return diff(args._[0], args._[1])

  openDat(args, function (err, db) {
    if (err) abort(err, args)
    db.status(function (err, status) {
      if (err) abort(err, args)
      diff(db, status.head, args._[0])
    })
  })

  function diff (db, headA, headB) {
    var diffs = createDiffStream(db, headA, headB, args)
    if (!args.json) {
      diffs = pumpify.obj(diffs, through.obj(function (diff, enc, next) {
        next(null, diff.versions)
      }))
    }

    var diffOpts = {
      getRowValue: function (row) { return row.value },
      getHeaderValue: function (diff, i) {
        var onediff = diff && diff[0] || diff[1]
        return 'row ' + (i + 1) + ' key: ' + onediff['key'] + '\n'
      }
    }

    var printer = args.json ? ndjson.serialize() : diffToString(diffOpts)

    pump(diffs, printer, process.stdout, function done (err) {
      if (err) abort(err, args)
    })
  }
}
