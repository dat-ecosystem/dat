var path = require('path')

module.exports = Dat

function Dat(dir, opts) {
  // if 'new' was not used
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  
  this.dir = dir
  this.opts = opts
}

Dat.prototype = require(path.join(__dirname, 'lib', 'commands'))
