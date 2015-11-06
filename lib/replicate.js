var transport = require('transport-stream')
var httpReplicator = require('dat-http-replicator')
var streamReplicator = require('dat-stream-replicator')
var url = require('url')
var ProgressBar = require('progress')

module.exports = function (db, remote, opts, cb) {
  var u = url.parse(remote)
  var stream
  if (u.protocoly && u.protocol.indexOf('http') > 0) stream = httpReplicator.client(db, remote, opts)
  else {
    var transportOpts = {
      command: (opts.bin || 'dat') + ' replicate'
    }
    var remoteStream = transport(transportOpts)(remote)
    var localStream = streamReplicator(db, opts)
    stream = remoteStream.pipe(localStream).pipe(remoteStream)
  }
  var bar = null

  stream.on('pull', onprogress)
  stream.on('push', onprogress)

  function onprogress (progress) {
    if (progress.length === 0) return
    if (!bar) bar = new ProgressBar('[:bar] :percent', {total: progress.length})
    bar.tick(progress.transferred)
  }

  stream.on('end', function () {
    bar = null
    cb()
  })

  stream.on('error', cb)
}
