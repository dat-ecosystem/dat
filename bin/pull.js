var log = require('../lib/progress-log')

module.exports = function(dat, opts, cb) {
  var remote = opts._[1]
  var pull = dat.pull(remote, opts, cb)
  if (!opts.quiet) log(pull, 'Pulled', 'Pulling from changes has completed.')
}