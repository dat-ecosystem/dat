var usage = require('../lib/util/usage.js')('checkout.txt')

module.exports = {
  name: 'checkout',
  command: handleCheckout
}

function handleCheckout (args) {
  if (args.help || args._.length === 0) return usage()

  throw new Error('Unimplemented')
}
