var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('checkout.txt')

module.exports = {
  name: 'checkout',
  command: handleCheckout
}

function handleCheckout (args) {
  if (args.help || args._.length === 0) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    var head = args._[0]
    var checkout = db.checkout(head === 'latest' ? null : head, {persistent: true})

    checkout.on('error', done)
    checkout.on('ready', done)

    function done (err) {
      if (err) return abort(err, args, 'Could not find checkout with hash ' + head)
      console.error('Current version is now', checkout.head)
    }
  })
}
