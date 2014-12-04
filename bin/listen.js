var EOL = require('os').EOL

module.exports = listen

listen.usage = ['dat listen [--port=<port>]', 'Start a dat server'].join(EOL)

function listen(dat, opts, cb) {
  dat.listen(opts.port, opts, function(err, port) {
    if (err) return cb(err)
    console.log('Listening on port ' + port)
    // do not call the cb as we want to keep being open
  })
}