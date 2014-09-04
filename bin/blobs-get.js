module.exports = function(dat, opts, cb) {
  var args = opts._.slice(2)
  if (args.length < 2) return cb(new Error('Usage: dat blobs get <rowKey> <blobKey>'))
  var rs = dat.createBlobReadStream(args[0], args[1])
  rs.on('finish', cb)
  rs.on('error', cb)
  rs.pipe(process.stdout)
}
