var abort = require('../lib/abort.js')
var Dat = require('..')
var usage = require('../lib/usage.js')('clone.txt')

module.exports = {
  name: 'clone',
  command: handleClone
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var source = args._[0]
  var path = args._[1] || '.'

  Dat.clone(source, path, args, function (err, dat) {
    if (err) abort(err, args)
    console.error('Clone from remote has completed.')
  })
}
