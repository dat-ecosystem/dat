var path = require('path')
var meta = require(path.join(__dirname, 'lib', 'meta.js'))
var commands = require(path.join(__dirname, 'lib', 'commands'))
var concat = require('concat-stream')

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
      self._storage(opts, function(err) {
        if (err) return onReady(err)
        loadAllSchemas(onReady)
      })
    })
  })
  
  function loadAllSchemas(cb) {
    if (self.meta.json.schemaVersion === 0) return cb()
    self.schemas.createReadStream().pipe(concat(function(schemas) {
      schemas.map(function(schema) {
        self.meta.schemas[schema.version] = {
          version: schema.version,
          columns: JSON.parse(schema.value).columns
        }
      })
      cb()
    }))
  }
}

Dat.prototype = commands
