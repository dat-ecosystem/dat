var mkdirp = require('mkdirp')
var path = require('path')
var homeDir = require('home-dir')
var level = require('level-party')
var xtend = require('xtend')

module.exports = function (opts) {
  var defaults = {
    createIfMissing: true
  }
  opts = xtend(opts, defaults)
  var dbDir = path.join(opts.home || homeDir(), '.dat', 'db')
  if (opts.createIfMissing) mkdirp.sync(dbDir) // ensure all parent foldes exist
  var levelup = level(dbDir, opts)
  return levelup
}
