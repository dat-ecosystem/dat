var transport = require('transport-stream')
var httpReplicator = require('dat-http-replicator')
var streamReplicator = require('dat-stream-replicator')
var url = require('url')
var ProgressBar = require('progress')

module.exports = function (db, remote, opts, cb) {
  var u = url.parse(remote)
  if (u.protocol && u.protocol.indexOf('http') > 0) return progress(httpReplicator.client(db, remote, opts))

  var transportOpts = {
    command: (opts.bin || 'dat') + ' replicate -'
  }
  var remoteStream = transport(transportOpts)(remote)
  var localStream = streamReplicator(db, opts)
  progress(remoteStream)
  progress(localStream)
  remoteStream.pipe(localStream).pipe(remoteStream)

  function progress (stream) {
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
    return stream
  }
}
