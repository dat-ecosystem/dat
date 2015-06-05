var pump = require('pump')
var through = require('through2')
var ndjson = require('ndjson')
var diffToString = require('diffs-to-string').stream
var openDat = require('../lib/open-dat.js')
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

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)

    if (args._.length === 2) return diff(args._[0], args._[1])

    db.status(function (err, status) {
      if (err) abort(err, args)
      diff(status.head, args._[0])
    })

    function diff (headA, headB) {
      var diffs = db.createDiffStream(headA, headB)

      var diffOpts = {
        getRowValue: function (row) { return row.value },
        getHeaderValue: function (diff, i) {
          var onediff = diff && diff[0] || diff[1]
          return 'row ' + (i + 1) + ' key: ' + onediff['key'] + '\n'
        }
      }

      var printer = args.json ? ndjson.serialize() : diffToString(diffOpts)

      pump(diffs, datDiffFormatter(), printer, process.stdout, function done (err) {
        if (err) throw err
      })

      function datDiffFormatter () {
        return through.obj(function write (obj, enc, next) {
          var a = obj[0]
          var b = obj[1]
          var diff = {}
          if (a) diff.key = a.key
          if (b) diff.key = b.key

          if (args.dataset) {
            if (a && a.dataset !== args.dataset) return next(null, null)
            if (b && b.dataset !== args.dataset) return next(null, null)
          }

          diff.forks = [headA, headB]
          diff.versions = []
          if (a) {
            diff.versions.push(a)
          } else {
            diff.versions.push(null)
          }
          if (b) {
            diff.versions.push(b)
          } else {
            diff.versions.push(null)
          }
          if (args.json) {
            next(null, diff)
          } else {
            next(null, diff.versions)
          }
        })
      }
    }
  })
}
