var pump = require('pump')
var pumpify = require('pumpify')
var through = require('through2')
var ndjson = require('ndjson')
var Dat = require('../')
var diffToString = require('diffs-to-string').stream
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('diff.txt')

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

  var dat = Dat(args)

  dat.status(function (err, status) {
    if (err) abort(err, args)
    diff(status.head, args._[0])
  })

  function diff (headA, headB) {
    var diffs = dat.createDiffStream(headA, headB, args)
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
      if (err) throw err
    })
  }
}
