var log = require('../lib/progress-log')
var EOL = require('os').EOL

module.exports = pull

pull.usage = ['dat pull <remoteurl>', 'pull data from another dat'].join(EOL)

function pull(dat, opts, cb) {
  var remote = opts._[1]
  var pull = dat.pull(remote, opts, cb)
  if (!opts.quiet) log(pull, 'Pulled', 'Pulling from changes has completed.')
}