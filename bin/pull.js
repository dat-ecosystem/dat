var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('pull.txt')
var dat = require('..')
var replicate = require('../lib/replicate.js')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
  var remote = config(args).dat.remote || args._[0]
  if (!remote) return usage()

  var db = dat(args)

  var replicator = replicate(db, remote, {mode: 'pull'})
  replicator.on('error', function (err) {
    abort(err, args)
  })
  replicator.on('end', function () {
    console.error('Done!')
  })
}
