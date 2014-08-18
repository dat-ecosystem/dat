var fs = require('fs')
var tty = require('tty')
var path = require('path')
var os = require('os')
var writeread = require('write-transform-read')
var resolve = require('resolve')
var extend = require('extend')

var debug = require('debug')('dat.init')
var request = require('request').defaults({json: true})

var stats = require('./lib/stats')
var transformations = require('./lib/transformations.js')
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

  this.beforePut = echo
  this.afterGet = echo
  this.listenHook = echoHook

  var paths = this.paths(dir)
  
  debug(JSON.stringify(opts))

  var req = function(name) {
    return require(resolve.sync(name, {basedir: paths.dir}))
  }

  var toHook = function(hook) {
    if (hook && hook.module) return req(hook.module)
    else if (typeof hook === 'function') return hook
    return echoHook
  }

  var toTransform = function(trans) {
    return trans ? writeread(transformations(trans)) : echo
  }

  readDefaults(paths.package, opts, function(err, data) {
    if (err) throw err

    self.options = data
    data.init = opts.init

    if (data.blobs && data.blobs.module) data.blobs = req(data.blobs.module)(extend({path:paths.blobs}, data.blobs))
    else if (!data.blobs) data.blobs = require('local-blob-store')({path:paths.blobs})
    else if (typeof data.blobs === 'function') data.blobs = data.blobs({path:paths.blobs})

    if (data.replicator && data.replicator.module) data.replicator = req(data.replicator.module)
    else if (!data.replicator) data.replicator = require('dat-replicator')

    if (data.leveldown && data.leveldown.module) data.leveldown = req(data.leveldown.module)
    else if (!data.leveldown) data.leveldown = require('leveldown-prebuilt')

    self.beforePut = toTransform(data.transformations.put)
    self.afterGet = toTransform(data.transformations.get)
    self.listenHook = toHook(data.hooks.listen)

    if (!opts.storage) {
      onReady()
    } else {
      function read() {
        readPort(paths.port, function(err) {
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
    commands._ensureExists({ path: dir }, function(err) {
      if (err) return init()
      self._storage(self.options, function(err) {
        if (err && self.lockRetries < self.retryLimit) {
          readPort(paths.port, function(err) {
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
        if (!self.options.init) return onReady()
        return self.init(self.options, onReady)
      } else {
        onReady()
      }
    })
  }

  function readPort(portPath, cb) {
    getPort.readPort(portPath, function(err, port) {
      if (err) return cb(err)
      var adminu = self.options.adminUser || process.env["DAT_ADMIN_USER"]
      var adminp = self.options.adminPass || process.env["DAT_ADMIN_PASS"]
      var creds = ''
      if (adminu && adminp) creds = adminu + ':' + adminp + '@'
      var datAddress = 'http://' + creds + '127.0.0.1:' + port
      request(datAddress + '/api/manifest', function(err, resp, json) {
        if (err || !json.methods) {
          // assume PORT to be invalid
          return fs.unlink(portPath, cb)
        }
        self.rpcClient = true
        self.options.remoteAddress = datAddress
        self.options.manifest = json
        cb()
      })
    })
  }
}

function echoHook(dat, cb) {
  cb()
}

function echo(val, cb) {
  cb(null, val)
}

function readDefaults(path, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }

  if (!opts) opts = {}

  var req = function(name) {
    return require(resolve.sync(name, {basedir:paths.dir}))
  }

  readDatJSON(path, function(err, data) {
    if (err) return cb(err)

    data.adminUser = opts.adminUser || data.adminUser
    data.adminPass = opts.adminPass || data.adminPass

    data.blobs = normalizeModule(opts.blobs || data.blobs)
    data.replicator = normalizeModule(opts.replicator || data.replicator)
    data.leveldown = normalizeModule(opts.leveldown || data.leveldown)
    data.transformations = opts.transformations || data.transformations || {}
    data.hooks = opts.hooks || data.hooks || {}
    data.remotes = opts.remotes || data.remotes || {}

    if (typeof data.remotes === 'string') data.remotes = {origin:data.remotes}
    if (typeof opts.remote === 'string') data.remotes.origin = opts.remote

    var transformations = normalizeTransformations(opts)

    data.transformations.get = transformations.get || data.transformations.get
    data.transformations.put = transformations.put || data.transformations.put

    data.hooks.listen = normalizeModule(data.hooks.listen)

    if (typeof opts.remote === 'string') data.remotes.origin = opts.remote
    if (opts.remotes) data.remotes.origin = opts.remotes.origin

    data.port = opts.port || data.port || 6461
    data.skim = opts.skim || data.skim

    cb(null, data)
  })
}

function normalizeModule(mod) {
  if (typeof mod === 'string') return {module:mod}
  return mod
}

function normalizeTransformations(opts) {
  var transformations = opts.transformations || {}

  if (Array.isArray(transformations)) transformations = {put:transformations}
  if (transformations.get) transformations.get = [].concat(transformations.get)
  if (transformations.put) transformations.put = [].concat(opts.transformations.put)

  return transformations
}

function readDatJSON(path, cb) {
  fs.readFile(path, 'utf-8', function(err, data) {
    if (err && err.code !== 'ENOENT') return cb(err)

    try {
      data = JSON.parse(data || '{}')
    } catch (err) {
      return cb(new Error('Invalid dat.json file'))
    }

    cb(null, data)
  })
}


Dat.prototype = commands
