var stringKey = require('dat-encoding').toStr

module.exports = function (key) {
  return `Link: dat://${stringKey(key)}`
}
