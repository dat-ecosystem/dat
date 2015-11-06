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

  replicate(db, remote, {mode: 'push'}, function (err) {
    if (err) abort(err, args)
    console.error('Done!')
  })
}
