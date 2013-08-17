var level = require('level')
var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')

module.exports = Dat

function Dat(dir, opts) {
  // if 'new' was not used
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  this.dir = dir
  this.opts = opts
}

Dat.prototype.exists = function(options, cb) {
  var dir = process.cwd()
  if (options.path) dir = options.path
  var datPath = path.join(dir, '.dat')
  var levelPath = path.join(datPath, 'data.dat')
  fs.exists(datPath, function(exists) {
    if (!exists) return cb(false, false)
    fs.exists(levelPath, function(exists) {
      cb(false, exists)
    })
  })
}

Dat.prototype.init = function(dir) {
  console.log('TODO')
}

Dat.prototype.help = function() {
  console.log('TODO')
}