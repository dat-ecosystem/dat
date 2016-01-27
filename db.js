var mkdirp = require('mkdirp')
var path = require('path')
var homeDir = require('home-dir')
var level = require('level-party')
var xtend = require('xtend')
var crypto = require('crypto')

module.exports = function (opts) {
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  var dir = path.resolve(opts.path || process.cwd())
  var id = crypto.createHash('sha256').update(dir).digest('base64').replace(/[^0-9a-zA-Z]/g, '')
  var dbDir = path.join(opts.home || homeDir(), '.dat', 'db', id.slice(0, 2), id.slice(2, 22))
  if (opts.createIfMissing) mkdirp.sync(dbDir) // ensure all parent foldes exist
  var levelup = level(dbDir, opts)
  return levelup
}
