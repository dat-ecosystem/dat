var replicator = require('dat-http-replicator')
var ProgressBar = require('progress')

module.exports = function (db, remote, opts, cb) {
  var puller = replicator.client(db, remote, {mode: 'pull'}, cb)

  var bar = null

  puller.on('pull', function (progress) {
    if (progress.length === 0) return
    if (!bar) bar = new ProgressBar('[:bar] :percent', {total: progress.length})
    bar.tick(progress.transferred)
  })

  puller.on('push', function (progress) {
    if (progress.length === 0) return
    if (!bar) bar = new ProgressBar('[:bar] :percent', {total: progress.length})
    bar.tick(progress.transferred)
  })

  puller.on('end', function () {
    bar = null
  })

  puller.on('error', cb)
}
