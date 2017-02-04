var debug = require('debug')('dat')

module.exports = function (log) {
  return function (err) {
    if (err) {
      if (debug.enabled) console.trace(err)
      else console.error(err)
      process.exit(1)
    }
    if (log) log.print()
    process.exit(0)
  }
}
