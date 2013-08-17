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

Dat.prototype.exists = function(dir, cb) {
  var datPath = path.join(dir, '.dat')
  fs.exists(datPath, function(exists) {
    if (!exists) return cb(false, false)
    
  })
}

Dat.prototype.init = function(dir) {
  process.stdout.write('TODO\n')
}

Dat.prototype.help = function() {
  process.stdout.write('TODO\n')
}