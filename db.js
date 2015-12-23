var mkdirp = require('mkdirp')
var level = require('level-party')
var xtend = require('xtend')

module.exports = function (dbDir, opts) {
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  if (opts.createIfMissing) mkdirp.sync(dbDir) // ensure all parent foldes exist
  var levelup = level(dbDir, opts)
  return levelup
}
