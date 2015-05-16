var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('checkout.txt')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)

    db.open(function () {
      console.error('Current version is', db.head)
    })
  })
}