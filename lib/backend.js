var path = require('path')
var readInstalled = require('read-installed')
var npm = require('npm')

module.exports = Backend

function Backend(dat) {
  if (!(this instanceof Backend)) return new Backend(dat)
  this.dat = dat
  this.dir = this.dat.paths().dat
}

Backend.prototype.installed = function(cb) {
  readInstalled(this.dir, function(err, deps) {
    cb(err, deps.dependencies || {})
  })
}

Backend.prototype.set = function(backend, cb) {
  var self = this
  var meta = this.dat.meta
  if (backend === 'leveldown') return update()
  
  this.installed(function(err, installed) {
    if (installed[backend]) return update()
    self.install(backend, update)
  })
  
  function update(err) {
    if (err) return cb(err)
    meta.json.backend = backend
    meta.update(meta.json, cb)
  }
}

Backend.prototype.install = function(backend, cb) {
  var self = this
  npm.load(function(err) {
    if (err) return cb(err)
    npm.commands.install(self.dir, backend, cb)
  })
}
