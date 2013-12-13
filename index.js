var path = require('path')
var meta = require(path.join(__dirname, 'lib', 'meta.js'))
var commands = require(path.join(__dirname, 'lib', 'commands'))

module.exports = Dat

// new Dat(cb)
// new Dat({foo: bar})
// new Dat({foo: bar}, cb)
// new Dat('./foo)
// new Dat('./foo', cb)
// new Dat('./foo', {foo: bar})
// new Dat('./foo', {foo: bar}, cb)

function Dat(dir, opts, onReady) {
  var self = this
  
  // if 'new' was not used
  if (!(this instanceof Dat)) return new Dat(dir, opts)

  if (typeof dir === 'function') {
    onReady = dir
    opts = {}
    dir = process.cwd()
  }
  
  if (typeof opts === 'function') {
    onReady = opts
    opts = {}
  }
  
  if (typeof dir === 'object') {
    onReady = opts
    opts = dir
    dir = process.cwd()
  }
  
  if (!onReady) onReady = function(){}
  
  this.dir = dir
  this.opts = opts
  
  this.meta = meta(this, function(err) {
    if (err) return onReady()
    commands._ensureExists({path: self.dir}, function (err) {
      if (err) return onReady()
      self._storage(opts, onReady)
    })
  })
}

Dat.prototype = commands
