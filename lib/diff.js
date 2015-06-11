var pumpify = require('pumpify')
var through = require('through2')

module.exports = function createDiffStream (db, headA, headB, opts) {
  if (!opts) opts = {}
  var diffStream = db.createDiffStream(headA, headB, opts)

  function datDiffFormatter () {
    return through.obj(function write (obj, enc, next) {
      var a = obj[0]
      var b = obj[1]
      var diff = {}
      if (a) diff.key = a.key
      if (b) diff.key = b.key

      if (opts.dataset) {
        if (a && a.dataset !== opts.dataset) return next(null, null)
        if (b && b.dataset !== opts.dataset) return next(null, null)
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
      next(null, diff)
    })
  }
  return pumpify.obj(diffStream, datDiffFormatter())
}
