var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('push.txt')
var replicator = require('dat-http-replicator')
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

  replicator.client(db, remote, function (err) {
    if (err) abort(err, args)
    console.error('Done!')
  })
}
