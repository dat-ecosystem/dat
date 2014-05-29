var request = require('request')
var extend = require('extend')
var combiner = require('stream-combiner')
var through =  require('through2')

module.exports = Replicator

function Replicator(dat, options) {
  if (!(this instanceof Replicator)) return new Replicator(dat, options)
  this.dat = dat
  this.options = options
}

// pipes remote data into dat and returns a stream that gets piped to dat.progressLogStream
// note: calling .end on the stream returned must end the pull
Replicator.prototype.createPullStream = function(remote, options) {
  var self = this
  // TODO expose way to handle conflicts at pull-time
  extend(options, { data: true })
  var pullStream = this.dat.storage.createPullStream(remote + '/api/changes', options)
  pullStream.remote = remote
  
  // if a document with attachments is encountered fetch all attachments before continuing
  var blobFetcher = through.obj(function(obj, enc, next) {
    if (!obj.attachments) {
      blobFetcher.push(obj)
      return next()
    }
    var attachments = Object.keys(obj.attachments)
    var pending = attachments.length
    for (var i = 0; i < attachments.length; i++) {
      var filename = attachments[i]
      var attachment = obj.attachments[filename]
      var attachmentReq = request(remote + '/api/' + obj.key + '/' + filename)
      attachmentReq.on('error', function(err) {
        blobFetcher.emit('error', err)
      })
      var blobWrite = self.dat.blobs.createWriteStream(function(err, hash) {
        if (err) return blobFetcher.emit('error', err)
        if (--pending === 0) {
          blobFetcher.push(obj)
          next()
        }
      })
      attachmentReq.pipe(blobWrite)
    }
  })
  
  var writeStream = this.dat.createWriteStream({ objects: true, batchTime: 250 })
  return combiner(pullStream, blobFetcher, writeStream)
}

// pipes local data into remote and returns a stream that gets piped to dat.progressLogStream
Replicator.prototype.createPushStream = function(remote, options) {
  var self = this
  var pushStream = through()
  
  request(remote + '/api', {json: true}, function(err, resp, meta) {
    if (err) return pushStream.emit('error', new Error('could not connect to ' + remote + ' - ' + err.message))
    if (!meta) return pushStream.emit('error', new Error('received no metadata from remote address'))
    if (Object.keys(meta).indexOf('changes') === -1) return pushStream.emit('error', new Error('no changes in metadata'))
    var readOpts = { since: meta.changes, data: true }
    if (options.live) readOpts.live = true
    var readStream = self.dat.createChangesStream(readOpts)
    
    // if dat.replicator.createPushStream().end() is called it should end the readStream
    pushStream.on('end', function() {
      readStream.end()
    })
    
    var headers = {'content-type': 'application/json'}
    var post = request({ method: 'POST', uri: remote + '/api/bulk', headers: headers })
    var serializer = through.obj(function write(obj, enc, next) {
      this.push(JSON.stringify(obj.data) + '\n')
      next()
    })
    
    readStream.pipe(serializer).pipe(post).pipe(pushStream)
  })
  
  return pushStream
}
