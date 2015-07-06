var dat = require('dat-core')
var config = require('./lib/util/config.js')()

module.exports = Dat

function Dat (path, opts) {
  if (!opts) opts = {}
  if (!opts.valueEncoding) opts.valueEncoding = 'json'

  if (config.addons && config.addons.backend) {
    opts.backend = require(config.addons.backend.module)
    opts.path = process.env[config.addons.backend.env]
  }

  var db = dat(path, opts)
  if (opts.checkout) db = db.checkout(opts.checkout)

  return db
}
