var readConfig = require('./lib/util/config.js')

module.exports = Dat

function Dat (path, opts) {
  if (!opts) opts = {}
  var config = readConfig({path: path})

  throw new Error('Unimplemented')
}
