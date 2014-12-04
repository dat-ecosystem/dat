module.exports = rowsGet

rowsGet.usage = 'dat rows get <rowKey> [<version>]'

function rowsGet(dat, opts, cb) {
  var args = opts._.slice(2)
  if(args.length === 0) return cb(new Error('Usage: ' + rowsGet.usage))
  var opts = {}
  if(args[1]) opts.version = Number(args[1])
  
  dat.get(args[0], opts, function (err, value) {
    if(err) return cb(err)
    console.log(JSON.stringify(value))
    cb()
  })
}