module.exports = function (dat, opts, cb) {
  var args = opts._.slice(2)
  if (args.length < 1) return cb(new Error('Usage: dat rows get <rowKey> [<version>]'))
  var opts = {}
  if(args[1]) opts.version = Number(args[1])
  
  dat.get(args[0], opts, function (err, value) {
    if(err) return cb(err)
    console.log(JSON.stringify(value))
    cb()
  })
}