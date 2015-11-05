var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('pull.txt')
var replicator = require('dat-http-replicator')
var dat = require('..')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'pull',
  command: handlepull,
  options: [
    {
      name: 'username',
      boolean: false,
      abbr: 'u'
    },
    {
      name: 'password',
      boolean: false,
      abbr: 'p'
    }
  ]
}

function handlepull (args) {
  var remote = config(args).dat.remote || args._[0]
  if (!remote) return usage()

  var db = dat(args)

  replicator.client(db, remote, function (err) {
    if (err) abort(err, args)
    console.error('Done!')
  })
}
