var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('clone.txt')
var clone = require('../lib/clone.js')

module.exports = {
  name: 'clone',
  command: handleClone
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var source = args._[0]
  var path = args._[1] || '.'

  clone(source, path, args, function (err, dat) {
    if (err) abort(err, args)
    console.error('Clone from remote has completed.')
  })
}
