var checkout = require('../lib/checkout.js')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('checkout.txt')

module.exports = {
  name: 'checkout',
  command: handleCheckout
}

function handleCheckout (args) {
  if (args.help || args._.length === 0) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err)

    var head = args._[0]
    db = checkout(db, head)

    db.on('error', done)
    db.on('ready', done)

    function done (err) {
      if (err) return abort(err, args, 'Could not find checkout with hash ' + head)
      var msg = 'Current version is now ' + db.head
      if (args.json) console.log(JSON.stringify({version: db.head, message: msg}))
      else console.log(msg)
      db.close()
    }
  })
}
