var mkdirp = require('mkdirp')
var level = require('level')
var xtend = require('xtend')

module.exports = function (dbPath, opts) {
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  if (opts.createIfMissing) mkdirp.sync(dbPath)
  var levelup = level(dbPath, opts)
  return levelup
}
