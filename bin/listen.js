var EOL = require('os').EOL

module.exports = listen

listen.usage = ['dat listen', 'Start a dat server'].join(EOL)

listen.options = [
  {
    name: 'port',
    abbr: 'p',
    default: 6461,
    help: 'port the dat will listen to'
  }
]

function listen(dat, opts, cb) {
  dat.listen(opts.port, opts, function(err, port) {
    if (err) return cb(err)
    console.log('Listening on port ' + port)
    // do not call the cb as we want to keep being open
  })
}