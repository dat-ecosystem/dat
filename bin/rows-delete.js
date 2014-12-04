module.exports = rowsDelete

rowsDelete.usage = 'dat rows delete <rowKey>'

function rowsDelete(dat, opts, cb) {
  var args = opts._.slice(2)
  if(args.length === 0) return cb(new Error('Usage: ' + rowsDelete.usage))
  dat.delete(args[0],function (err, newVersion) {
    if(err) return cb(err)
    console.log('Row with key', args[0], 'marked as deleted.')
    cb()
  })
}