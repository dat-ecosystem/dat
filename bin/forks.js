var usage = require('../lib/usage.js')('forks.txt')
var Dat = require('../')
var abort = require('../lib/abort.js')

module.exports = {
  name: 'forks',
  command: handleForks
}

function handleForks (args) {
  if (args.help) return usage()
  var dat = Dat(args)

  dat.forks(function (fork) {
    console.log(fork)
  })
}
