var usage = require('../lib/usage.js')('forks.txt')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')

module.exports = {
  name: 'forks',
  command: handleForks
}

function handleForks (args) {
  if (args.help) return usage()
  openDat(args, function ready (err, db) {
    if (err) abort(err)

    db.heads()
      .on('data', function head (obj) {
        console.log(obj)
      })
      .on('error', abort)
  })
}
