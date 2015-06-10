var usage = require('../lib/util/usage.js')('forks.txt')
var forks = require('../lib/forks.js')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'forks',
  command: handleForks
}

function handleForks (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    forks(db, function (err, fork) {
      if (err) abort(err, args)
      console.log(fork)
    })

  })
}
