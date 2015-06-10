var transports = require('transport-stream')

module.exports = function (bin) {
  bin = bin || 'dat'
  return transports({
    command: bin + ' replicate -'
  })
}
