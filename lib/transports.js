var transports = require('transport-stream')

module.exports = transports({
  command: 'dat replicate -'
})
