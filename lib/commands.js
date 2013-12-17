// this module assumes it will be used as a .prototype (e.g. uses `this`)

var fs = require('fs')
var path = require('path')
var http = require('http')
var EOL = require('os').EOL
var events = require('events')

var bops = require('bops')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var extend = require('extend')
var request = require('request')
var level = require('level-hyper')
var sleepRef = require('sleep-ref')
var LiveStream = require('level-live-stream')
var fbackup = require('folder-backup')
var levelBackup = require('hyperlevel-backup')
var ldj = require('ldjson-stream')
var connections = require('connections')
var sublevel = require('sublevel')
var version = require("level-version")

var storage = require(path.join(__dirname, 'storage'))
var restHandler = require(path.join(__dirname, 'rest-handler'))
var writeStream = require(path.join(__dirname, 'write-stream'))

var dat = {}

module.exports = dat

dat.dbOptions = {
  writeBufferSize: 1024 * 1024 * 16 // 16MB
}

dat.paths = function(root) {
  root = root || this.dir || process.cwd()
  var datPath = path.join(root, '.dat')
  var levelPath = path.join(datPath, 'store.dat')
  var packagePath = path.join(root, 'package.json')
  return {
    dat: datPath,
    level: levelPath,
    package: packagePath
  }
}

dat.exists = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof options === 'string') options = {path: options}
  if (!options) options = {}
  var paths = this.paths(options.path)
  fs.exists(paths.dat, function datExists(exists) {
    if (!exists) return cb(false, exists)
    fs.exists(paths.level, function levelExists(exists) {
      if (!exists) return cb(false, exists)
      fs.exists(paths.package, function packageExists(exists) {
        cb(false, exists)
      })
    })
  })
}

dat.init = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof options === 'string') options = {path: path}
  if (Object.keys(options).indexOf('defaults') === -1) options.defaults = true
  
  var self = this
  var paths = this.paths(options.path)
  
  mkdirp(paths.dat, function (err) {
    if (err) return cb(err)
    
    self.meta.package.init(options, function(err, data) {
      if (err) return cb(err)
      self.exists(options, function datExists(err, exists) {
        if (err) return cb(err)
        var msg = "A dat store already exists at " + paths.dat
        if (exists) return cb(new Error(msg), msg)
        newDat(options, cb)
      })
    })
  })
  
  
  function newDat(options, cb) {
    if (options.remote) remoteDB(options.remote, cb)
    else localDB(paths.level, cb)
  }
  
  function remoteDB(remote, cb) {
    var opts = {
      showProgress: true,
      path: paths.level
    }
    
    fbackup.clone(remote + '/_archive', opts, cloned)
    
    function cloned(err) {
      if (err) return cb(err)
      request({json: true, uri: remote + '/_package'}, function(err, resp, json) {
        if (err) return cb(err)
        self.meta.package.write(json, function(err) {
          if (err) return cb(err)
          self.meta.json = json
          initStorage({ path: paths.level }, function(err) {
            if (err) return cb(err)
            self.meta.loadAllSchemas(cb)
          })
        })
      })
    }
  }
  
  function localDB(dbPath, cb) {
    self.db = self.level(dbPath, options, function(err) {
      if (err) return cb(err)
      initStorage(cb)
    })
  }
  
  function initStorage(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = options
    }
    var store = self._storage(opts, function(err, seq) {
      if (err) return cb(err)
      cb(err, "Initialized dat store at " + paths.dat)
    })
  }
}

dat.destroy = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof options === 'string') options = {path: path}
  var self = this
  var paths = this.paths(options.path)
  if (this.db) this.db.close(destroyDB)
  else destroyDB()
  function destroyDB() {
    fs.unlink(paths.package, function(err) {
      if (err && err.code !== 'ENOENT') return cb(err)
      rimraf(paths.dat, cb)
    })
  }
}

dat.help = function() {
  fs.createReadStream(path.join(__dirname, '..', 'usage.md')).pipe(process.stdout)
}

dat.level = function(path, opts, cb) {
  var self = this
  if (this.db) return this.db
  if (!opts) opts = {}
  path = path || this.paths(path).level
  var db = level(path, extend({}, opts, this.dbOptions), cb)

  // db addons
  LiveStream.install(db)
  this.schemas = version(sublevel(db, 'schemas'), { defaultVersion: incrementVersion})
  var json = self.meta.json

  function incrementVersion() {
    json.schemaVersion = json.schemaVersion || 0
    return ++json.schemaVersion
  }
  
  this.db = db
  return db
}

dat.serve = function(options, cb) {
  if (!cb) {
    cb = options
    options = {}
  }
  var self = this
  
  // if already listening then return early w/ success callback
  if (this._server) {
    setImmediate(cb)
    return
  }
  
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    self._sleep(options, function(err, sleep) {
      if (err) return cb(err)
      var restAPI = restHandler(self)
      self._server = http.createServer(function(req, res) {
        if (req.url.match(/^\/favicon.ico/)) return res.end()
        if (req.url.match(/^\/_archive/)) return levelBackup(self.db.db, {dir: self.paths().level}, res)
        if (req.url.match(/^\/_changes/)) return sleep.httpHandler(req, res)
        return restAPI.handle(req, res)
      })
      // TODO set socket timeout
      self.connections = connections(self._server)
      var port = options.port || 6461
      self._server.listen(port, function(err) {
        cb(err, 'Listening on ' + port)
      })
    })
  })
}

dat.pull = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (!cb) cb = function(){}
  var obj = {}
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      var remote = options['0'] || 'http://127.0.0.1:6461/_changes'
      extend(options, { include_data: true })
      var pullStream = store.createPullStream(remote, options)
      obj.stream = pullStream
      var writeStream = self.createWriteStream({objects: true, overwrite: false})
      pullStream.pipe(writeStream)
      writeStream.on('end', cb)
    })
  })
  return obj
}

dat.compact = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      store.compact(cb)
    })
  })
}

dat.dump = function(options, cb) {
  if (!options) options = {}
  var lev = this.level(options.path)
  var logger = ldj.serialize()
  lev.createReadStream().pipe(logger).pipe(process.stdout)
  logger.on('end', cb)
}

dat.cat = function(options, cb) {
  if (!cb) cb = function(){}
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      var logger = ldj.serialize()
      var readStream = self.createReadStream()
      readStream.pipe(logger).pipe(process.stdout)
      logger.on('end', cb)
    })
  })
}

dat.get = function(key, opts, cb) {
  return this.storage.get(key, opts, cb)
}

dat.put = function(rawDoc, buffer, opts, cb) {
  return this.storage.put(rawDoc, buffer, opts, cb)
}

dat.delete = function(key, opts, cb) {
  return this.storage.delete(key, opts, cb)
}

dat.createReadStream = function(opts) {
  return this.storage.createReadStream(opts)
}

dat.createChangesStream = function(opts) {
  return this.storage.createChangesStream(opts)
}

dat.createWriteStream = function(options) {
  return writeStream(this, options)
}

dat.close = function() {
  if (this._server) {
    this._server.close()
    this.connections.destroy()
  }
}

dat.dumpSchemas = function() {
  this.schemas.createReadStream().pipe(ldj.serialize()).pipe(process.stdout)
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(err, exists) {
    if (err) return cb(err)
    if (!exists) return cb("Error: You are not in a dat folder or are missing a package.json. " +
                           "Please run dat init again.")
    cb(false)
  })
}

dat._storage = function(options, cb) {
  if (this.storage) {
    setImmediate(cb)
    return this.storage
  }
  var sleepdb = this.level(options.path)
  this.storage = storage(sleepdb, this.meta, cb)
  return this.storage
}

dat._sleep = function(options, cb) {
  var self = this
  var store = this._storage(options, function(err, seq) {
    if (err) return cb(err)
    var sleepOpts = { style: "newline" }
    cb(false, sleepRef(function(opts) {
      return self.createChangesStream(opts)
    }, sleepOpts))
  })
}
