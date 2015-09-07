var dat = require('dat-core')
var resolve = require('resolve')
var readConfig = require('./lib/util/config.js')

module.exports = Dat

function Dat (path, opts) {
  if (!opts) opts = {}
  if (!opts.valueEncoding) opts.valueEncoding = 'json'

  // prevent new repos from being created if someone runs a read-only dat command in a folder
  if (typeof opts.createIfMissing === 'undefined') opts.createIfMissing = false

  var config = readConfig({path: path})

  if (config.dat && config.dat.backend) {
    var res = resolve.sync(config.dat.backend.module, { basedir: process.cwd() })
    var addon = require(res)
    var env = process.env[config.dat.backend.env]
    opts.backend = function () {
      return addon(env)
    }
  }

  var db = dat(path, opts)

  // make sure this is not set by dat-core before we set it
  if (typeof db.config !== 'undefined') throw new Error('db should not have config set yet')
  db.config = config

  return db
}
