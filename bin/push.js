var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('push.txt')
var replicate = require('../lib/replicate.js')
var dat = require('..')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'push',
  command: handlePush
}

function handlePush (args) {
  var remote = config(args).dat.remote || args._[0]
  if (!remote) return usage()

  var db = dat(args)

  var replicator = replicate(db, remote, {mode: 'push'})
  replicator.on('error', function (err) {
    abort(err, args)
  })
  replicator.on('end', function () {
    console.error('Done!')
  })
}
