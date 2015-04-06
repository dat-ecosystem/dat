var EOL = require('os').EOL

module.exports = listen

listen.usage = ['dat listen [--port=<port>] [-d]', 'Start a dat server'].join(EOL)

function listen(dat, opts, cb) {
  if (opts.d) {
    console.log('Starting dat in the background. \n\nYou can kill it by running \n\n    ps -ef | grep listen \n    kill <pid>\n')
    require('daemon')()
  }
  dat.listen(opts.port, opts, function(err, port) {
    if (err) return cb(err)
    console.log('Listening on port ' + port)
    // do not call the cb as we want to keep being open
  })
}