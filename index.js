var path = require('path')
var meta = require(path.join(__dirname, 'lib', 'meta.js'))
var commands = require(path.join(__dirname, 'lib', 'commands'))
var getPort = require(path.join(__dirname, 'lib', 'get-port'))
var backend = require(path.join(__dirname, 'lib', 'backend'))
var request = require('request').defaults({json: true})
var fs = require('fs')

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
  
  if (typeof dir === 'object') {
    onReady = opts
    opts = dir
    dir = process.cwd()
  }
  
  if (typeof opts === 'function') {
    onReady = opts
    opts = {}
  }
  
  if (!onReady) onReady = function(){}
  
  // TODO figure out more descriptive names/API for these
  // read dat dir but don't init empty database
  if (typeof opts.init === 'undefined') opts.init = true
  // read dat dir but don't read database
  if (typeof opts.storage === 'undefined') opts.storage = true
  
  this.dir = dir
  this.opts = opts
  var paths = this.paths()
  this._backend = backend(this)
  
  if (!opts.storage) {
    self.meta = meta(self, function(err) {
      onReady()
    })
  } else {
    getPort.readPort(paths.port, function(err, port) {
      if (err) return loadMeta()
      var adminu = opts.adminUser || process.env["DAT_ADMIN_USER"]
      var adminp = opts.adminPass || process.env["DAT_ADMIN_PASS"]
      var creds = ''
      if (adminu && adminp) creds = adminu + ':' + adminp + '@'
      var datAddress = 'http://' + creds + '127.0.0.1:' + port
      request(datAddress + '/_manifest', function(err, resp, json) {
        if (err || !json.methods) {
          // assume PORT to be invalid
          return fs.unlink(paths.port, loadMeta)
        } 
        // otherwise initialize in networked mode
        opts.serve = false
        opts.remoteAddress = datAddress
        opts.manifest = json
        loadMeta()
      })
    })
  }
  
  function loadMeta() {
    self.meta = meta(self, function(err) {
      if (err) return init()
      self._storage(opts, init)
    })
  }
  
  function init() {
    commands._ensureExists({ path: dir }, function (err) {
      if (err) {
        if (!opts.init) return serve()
        return self.init(opts, function(err) {
          if (err) return onReady(err)
          if (typeof opts.serve === 'undefined') opts.serve = true
          serve()
        })
      }
      if (typeof opts.serve === 'undefined') opts.serve = true
      return serve()
    })
  }
  
  function serve() {
    if (opts.serve) return self.serve(opts, onReady)
    onReady()
  }
}

Dat.prototype = commands
