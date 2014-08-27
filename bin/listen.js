module.exports = function(dat, opts, cb) {
  dat.listen(opts._[1] || opts.port, opts, function(err, port) {
    if (err) return cb(err)
    console.log('Listening on port ' + port)
    // do not call the cb as we want to keep being open
  })
}