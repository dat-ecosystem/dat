var dat = require('dat-core')
var config = require('./lib/util/config.js')()

module.exports = Dat

function Dat (path, opts) {
  if (!opts) opts = {}
  if (!opts.valueEncoding) opts.valueEncoding = 'json'

  if (config.addons && config.addons.backend) {
    var module = require(config.addons.backend.module)
    var env = process.env[config.addons.backend.env]
    opts.backend = function () {
      return module(env)
    }
  }

  var db = dat(path, opts)
  return db
}
