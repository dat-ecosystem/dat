var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('clone.txt')
var dat = require('..')
var fs = require('fs')
var replicator = require('dat-http-replicator')

module.exports = {
  name: 'clone',
  command: handleClone
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var remote = args._[0]
  var path = args._[1] || getName(remote)
  args.path = path
  console.log('Creating dat at', args.path)
  fs.exists(args.path, function (exists) {
    if (!exists) fs.mkdirSync(args.path)
    var db = dat(args)
    replicator.client(db, remote, function (err) {
      if (err) abort(err, args)
      console.error('Done!')
    })
  })
}

function getName (remote) {
  return remote
    .replace(/\.dat$/i, '').replace(/[^\-._a-z0-9]+$/i, '')
    .split(/[^\-._a-z0-9]/i).pop() || 'dat-' + Date.now()
}
