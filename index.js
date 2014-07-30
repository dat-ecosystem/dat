var fs = require('fs')
var tty = require('tty')
var path = require('path')
var os = require('os')
var writeread = require('write-transform-read')

var debug = require('debug')('dat.init')
var request = require('request').defaults({json: true})

var stats = require('./lib/stats')
var transformations = require('./lib/transformations.js')
var meta = require('./lib/meta.js')
var commands = require('./lib/commands.js')
var getPort = require('./lib/get-port.js')
var datVersion = require('./package.json').version

module.exports = Dat

// new Dat()
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
  
  if (typeof opts === 'undefined') opts = {}
  
  if (!onReady) onReady = function(){}
  
  // TODO figure out more descriptive names/API for these
  // read dat dir but don't init empty database
  if (typeof opts.init === 'undefined') opts.init = true
  // read dat dir but don't read database
  if (typeof opts.storage === 'undefined') opts.storage = true
  
  this.version = datVersion
  this.stats = stats()
  this.lockRetries = 0
  this.retryLimit = 3
  this.dir = dir || opts.path || process.cwd()
  this.options = opts
  this.beforePut = echo
  this.afterGet = echo
  this.remotes = {}

  var paths = this.paths(dir)
  
  debug(JSON.stringify(opts))
  
  readDatJSON(function(err, data) {
    if (err) throw err // TODO: emit when Dat becomes an eventemitter

    self.package = data
    normalizeTransformations(opts)

    var put = opts.transformations.put || data.transformations.put
    var get = opts.transformations.get || data.transformations.get

    if (put) self.beforePut = writeread(transformations(put))
    if (get) self.afterGet = writeread(transformations(get))
    
    if (data.remotes) self.remotes = data.remotes

    if (!opts.storage) {
      self.meta = meta(self, function(err) {
        onReady()
      })
    } else {
      function read() {
        readPort(paths.port, opts, function(err) {
          // ignore err
          loadMeta()
        })
      }
      // windows server fails when timeout is lower than 2000
      // timeout if called from CLI && is not a mac
      if (!tty.isatty(0) && !(os.platform().match('darwin'))) setTimeout(read, 2000)
      else read()
    }
  })
  
  function loadMeta() {
    self.meta = meta(self, function(err) {
      if (err) return init()
      self._storage(opts, function(err) {
        if (err && self.lockRetries < self.retryLimit) {
          readPort(paths.port, opts, function(err) {
            // ignore err
            loadMeta()
          })
          self.lockRetries++
          return
        }
        init()
      })
    })
  }
  
  function init() {
    commands._ensureExists({ path: dir }, function (err) {
      if (err) {
        if (!opts.init) return onReady()
        return self.init(opts, onReady)
      } else {
        onReady()
      }
    })
  }

  function readDatJSON(cb) {
    fs.readFile(paths.package, 'utf-8', function(err, data) {
      if (err && err.code !== 'ENOENT') return cb(err)

      try {
        data = JSON.parse(data || '{}')
      } catch (err) {
        return cb(new Error('Invalid dat.json file'))
      }

      normalizeTransformations(data)
      cb(null, data)
    })

  }
  
  function readPort(portPath, opts, cb) {
    getPort.readPort(portPath, function(err, port) {
      if (err) return cb(err)
      var adminu = opts.adminUser || process.env["DAT_ADMIN_USER"]
      var adminp = opts.adminPass || process.env["DAT_ADMIN_PASS"]
      var creds = ''
      if (adminu && adminp) creds = adminu + ':' + adminp + '@'
      var datAddress = 'http://' + creds + '127.0.0.1:' + port
      request(datAddress + '/api/manifest', function(err, resp, json) {
        if (err || !json.methods) {
          // assume PORT to be invalid
          return fs.unlink(portPath, cb)
        }
        self.rpcClient = true
        opts.remoteAddress = datAddress
        opts.manifest = json
        cb()
      })
    })
  }
}

function normalizeTransformations(opts) {
  if (!opts.transformations) opts.transformations = {}
  if (Array.isArray(opts.transformations)) opts.transformations = {put:opts.transformations}
  if (opts.transformations.get) opts.transformations.get = [].concat(opts.transformations.get)
  if (opts.transformations.put) opts.transformations.put = [].concat(opts.transformations.put)
}

function echo(val, cb) {
  cb(null, val)
}

Dat.prototype = commands
