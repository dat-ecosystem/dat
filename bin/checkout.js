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
    if (err) abort(err)
    var head = args._[0]

    try {
      var checkout = db.checkout(head)
      var layer = checkout._index.mainLayer
      db.open(function () { db.meta.put('layer', layer) })
      console.log('Checked out to', head)
    } catch (err) {
      abort(err, 'Could not find checkout with hash ', head)
    }
  })
}
