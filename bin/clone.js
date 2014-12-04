var log = require('../lib/progress-log')
var EOL = require('os').EOL

module.exports = clone

clone.usage = ['dat clone <remoteurl>', 'download a dat locally'].join(EOL)

function clone(dat, opts, cb) {
  if (dat.storage && dat.storage.change > 0) return cb(new Error('Cannot clone into existing dat repo'))
  var remote = opts._[1]
  var clone = dat.clone(remote, opts, cb)
  if (!opts.quiet) log(clone, 'Pulled', 'Clone from remote has completed.')
}