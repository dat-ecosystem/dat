module.exports = blobsGet

blobsGet.usage = 'dat blobs get <rowKey> <blobKey>'

function blobsGet(dat, opts, cb) {
  var args = opts._.slice(2)
  if (args.length < 2) return cb(new Error('Usage: ' + blobsGet.usage))
  var rs = dat.createBlobReadStream(args[0], args[1])
  rs.on('end', cb)
  rs.on('error', cb)
  rs.pipe(process.stdout)
}
