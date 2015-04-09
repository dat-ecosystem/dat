var pump = require('pump')
var through = require('through2')
var ndjson = require('ndjson')
var diffStream = require('sorted-diff-stream')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('diff.txt')

module.exports = {
  name: 'diff',
  command: handleDiff
}

function handleDiff (args) {
  if (args.help) return usage()
  if (args._.length < 2) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)

    var checkoutA = db.checkout(args._[0])
    var checkoutB = db.checkout(args._[1])
    var diffs = diffStream(checkoutA.createReadStream(), checkoutB.createReadStream(), jsonEquals)
    pump(diffs, datDiffFormatter(), ndjson.serialize(), process.stdout, function done (err) {
      if (err) throw err
    })

    function datDiffFormatter () {
      return through.obj(function write (obj, enc, next) {
        var a = obj[0]
        var b = obj[1]
        var diff = {}
        if (a) diff.key = a.key
        if (b) diff.key = b.key
        diff.versions = []
        if (a) {
          a.checkout = checkoutA.head
          diff.versions.push(a)
        } else {
          diff.versions.push(null)
        }
        if (b) {
          b.checkout = checkoutB.head
          diff.versions.push(b)
        } else {
          diff.versions.push(null)
        }
        next(null, diff)
      })
    }
  })
}

function jsonEquals (a, b, cb) {
  if (JSON.stringify(a.value) === JSON.stringify(b.value)) cb(null, true)
  else cb(null, false)
}
