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
  if (!(this instanceof Dat)) return new Dat(dir, opts, onReady)

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
  if (typeof opts.init === 'undefined') opts.init = true
  if (typeof opts.serve === 'undefined' && opts.init) opts.serve = true
  
  this.dir = dir
  this.opts = opts

  self.meta = meta(self, function(err) {
    if (err) return init()
    self._storage(opts, function(err) {
      if (err) return init(err)
      self.meta.loadAllSchemas(init)
    })
  })
  
  function init() {
    commands._ensureExists({ path: dir }, function (err) {
      if (err) {
        if (!opts.init) return ready()
        return self.init(opts, ready)
      }
      return ready()
    })
  }
  
  function ready() {
    if (opts.serve) return self.serve(opts, onReady)
    onReady()
  }
}

Dat.prototype = commands
