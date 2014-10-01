module.exports = function (dat, opts, cb) {
  var args = opts._.slice(2)
  if (args.length < 1) return cb(new Error('Usage: dat rows delete <rowKey>'))
  
  dat.delete(args[0],function (err, newVersion) {
    if(err) return cb(err)
    console.log('Row with key', args[0], 'marked as deleted.')
    cb()
  })
}