var pump = require('pump')
var path = require('path')
var fs = require('fs')
var ndjson = require('ndjson')
var abort = require('../lib/abort.js')
var transports = require('../lib/transports')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('checkout.txt')

module.exports = {
  name: 'checkout',
  command: handleCheckout
}

function handleCheckout (args) {
  if (args.help || args._.length == 0) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    try {
      var head = args._[0]
      var checkout = db.checkout(head)

      // write config file
      var checkoutPath = path.join(process.cwd(), '.dat', 'checkout')
      var writer = fs.createWriteStream(checkoutPath)
      writer.write(head)
    }
    catch (err){
      abort(err, "Could not find checkout with hash ", head)
    }

  })
}
