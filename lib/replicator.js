var request = require('request')
var extend = require('extend')
var combiner = require('stream-combiner')
var through =  require('through2')
var replicator = require('dat-replicator')

module.exports = Replicator

function Replicator(dat) {
  if (!(this instanceof Replicator)) return new Replicator(dat)
  this.dat = dat
  this.replicator = replicator(dat)
}

var noop = function() {}

// pipes remote data into dat and returns a stream that gets piped to dat.progressLogStream
// note: calling .end on the stream returned must end the pull
Replicator.prototype.createPullStream = function(remote, options) {
  var rcvd = this.replicator.receive()
  var req = request.post(remote+'/api/replicator/send')
  var progress = through.obj(noop)

  rcvd.on('document', function() {
    progress.push({type:'document'})
  })
  rcvd.on('protobuf', function() {
    progress.push({type:'protobuf'})
  })
  rcvd.on('end', function() {
    setTimeout(function() {
      progress.end()
    }, 1000)
  })

  req.pipe(rcvd).pipe(req)
  return progress
}

// pipes local data into remote and returns a stream that gets piped to dat.progressLogStream
Replicator.prototype.createPushStream = function(remote, options) {
  var rcvd = this.replicator.send()
  var req = request.post(remote+'/api/replicator/receive')
  var progress = through.obj(noop)

  rcvd.on('end', function() {
    setTimeout(function() {
      progress.end()
    }, 1000)
  })

  req.pipe(rcvd).pipe(req)
  return progress
}
