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
var level = require('level')
var sleepRef = require('sleep-ref')
var LiveStream = require('level-live-stream')
var levelBackup = require('hyperlevel-backup')
var ldj = require('ldjson-stream')
var connections = require('connections')
var sublevel = require('sublevel')
var version = require("level-version")
var through = require('through')
var multilevel = require('multilevel/msgpack')
var debug = require('debug')('dat.commands')

var clone = require(path.join(__dirname, 'clone'))
var storage = require(path.join(__dirname, 'storage'))
var restHandler = require(path.join(__dirname, 'rest-handler'))
var writeStream = require(path.join(__dirname, 'write-stream'))
var getPort = require(path.join(__dirname, 'get-port'))

var dat = {}

module.exports = dat

dat.dbOptions = {
  writeBufferSize: 1024 * 1024 * 16 // 16MB
}

dat.defaultPort = 6461

dat.paths = function(root) {
  root = root || this.dir || process.cwd()
  var datPath = path.join(root, '.dat')
  var levelPath = path.join(datPath, 'store.dat')
  var jsonPath =  path.join(datPath, 'dat.json')
  var portPath =  path.join(datPath, 'PORT')

  return {
    dat: datPath,
    level: levelPath,
    json: jsonPath,
    port: portPath
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
    if (!exists) return cb(exists)
    fs.exists(paths.level, function levelExists(exists) {
      if (!exists) return cb(exists)
      fs.exists(paths.json, function jsonExists(exists) {
        cb(exists)
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
    self.meta.write(self.meta.json, function(err) {
      if (err) return self.meta.write(options, checkExists)
      checkExists()
    })
  })
  
  function checkExists() {
    self.exists(options, function datExists(exists) {
      var msg = "A dat store already exists at " + paths.dat
      if (exists) return cb(new Error(msg), msg)
      newDat(options, cb)
    })
  }
  
  function newDat(options, cb) {
    if (options.remote) remoteDat(options.remote, cb)
    else localDat(paths.level, cb)
  }
  
  function remoteDat(remote, cb) {
    clone(self, remote, function(err) {
      initStorage({ path: paths.level }, function(err) {
        if (err) return cb(err)
        self.meta.loadAllSchemas(cb)
      })
    })
  }
  
  function localDat(dbPath, cb) {
    self.level(dbPath, options, function(err) {
      if (err) return cb(err)
      initStorage(cb)
    })
  }
  
  function initStorage(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = options
    }
    self._storage(opts, function(err, seq) {
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
  this.close()
  var paths = this.paths(options.path)
  if (this.db) this.db.close(destroyDB)
  else destroyDB()
  function destroyDB() {
    rimraf(paths.dat, cb)
  }
}

dat.help = function() {
  fs.createReadStream(path.join(__dirname, '..', 'usage.md')).pipe(process.stdout)
}

dat.serve = function(options, cb) {
  if (!cb) {
    cb = options
    options = {}
  }
  var self = this
  
  // if already listening then return early w/ success callback
  if (this._server && this._server.address()) {
    setImmediate(function() {
      cb(null, 'Listening on ' + self._server.address().port)
    })
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
      var startingPort = options.port || self.defaultPort
      getPort(startingPort, self.paths().port, function(err, port) {
        if (err) return cb(err)
        self._server.listen(port, function(err) {
          cb(err, 'Listening on ' + port)
        })
      })
    })
  })
}

dat.push = function(options, cb) {
  var self = this
  if (typeof options === 'string') options = {'0': options}
  var target = options['0']
  if (!target) return cb(new Error('no target specified'))
  request(target, {json: true}, function(err, resp, meta) {
    if (err) return cb(new Error('could not connect to ' + target + ' - ' + err.message))
    if (!meta) return cb(new Error('received no metadata from remote address'))
    if (Object.keys(meta).indexOf('sequence') === -1) return cb(new Error('no sequence in metadata'))
    var readOpts = { since: meta.sequence, include_data: true }
    if (options.live) readOpts.live = true
    var readStream = self.createChangesStream(readOpts)
    var headers = {'content-type': 'application/json'}
    var post = request({ method: 'POST', uri: target + '/_bulk', headers: headers })
    var serializer = through(function write(obj) {
      this.queue(JSON.stringify(obj.data) + '\n')
    })
    readStream.pipe(serializer).pipe(post).pipe(process.stdout)
    post.on('end', cb)
    post.on('error', cb)
  })
}

dat.pull = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof options === 'string') {
    options = [options]
  }
  if (!cb) cb = function(){}
  var obj = {}
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      var remote = options['0'] || 'http://127.0.0.1:' + self.defaultPort + '/_changes'
      extend(options, { include_data: true })
      var pullStream = store.createPullStream(remote, options)
      obj.stream = pullStream
      var writeStream = self.createWriteStream({ objects: true, overwrite: false })
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
  this.level(options.path)
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

dat.close = function(cb) {
  var self = this
  if (!cb) cb = function noop(){}
  
  if (this.rpcRequest) this.rpcRequest.end()
  
  if (this._server) {
    this.connections.destroy()
    try {
      this._server.close(rmPort)
    } catch(e) {
      rmPort()
    }
  } else rmPort()
  
  function rmPort() {
    fs.unlink(self.paths().port, cb)
  }
}

dat.dumpSchemas = function() {
  this.schemas.createReadStream().pipe(ldj.serialize()).pipe(process.stdout)
}

dat.level = function(dbPath, opts, cb) {
  var self = this
  if (this.db) return this.db
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  dbPath = dbPath || this.paths(dbPath).level
  var dbOpts = extend({}, opts, this.dbOptions)
  
  this.db = opts.remoteAddress ? remoteDb(opts) : localDb()
  installAddons(this.db)
  
  return this.db
  
  function remoteDb(opts) {
    var mdm = multilevel.client(opts.manifest)
    
    var rpcStream = mdm.createRpcStream()
    self.rpcRequest = request.post(opts.remoteAddress + '/_rpc')
    rpcStream.pipe(self.rpcRequest).pipe(rpcStream)
    
    return mdm
  }
  
  function localDb() {
    var db = level(dbPath, dbOpts, cb)
    return db
  }

  function installAddons(db) {
    // db addons
    LiveStream.install(db)
    self.schemas = version(sublevel(db, 'schemas'), { defaultVersion: incrementVersion })

    function incrementVersion() {
      var json = self.meta.json
      json.schemaVersion = json.schemaVersion || 0
      ++json.schemaVersion
      return json.schemaVersion
    }
  }
}

dat.backend = function(options, cb) {
  var self = this
  var set = options[0]
  if (set) return this._backend.set(set, function(err) {
    if (err) return cb(err, err)
    cb(null, "Switched backend to " + set)
  })
  this._backend.installed(function(err, installed) {
    if (err) return cb(err)
    var installed = Object.keys(installed)
    if (!installed) installed = ['memdown']
    else installed.push('memdown')
    var result = {
      available: installed
    }
    var current = self.meta.json.backend
    if (!current) result.current = 'memdown'
    else result.current = current
    cb(err, result)
  })
}

dat._storage = function(options, cb) {
  if (this.storage) {
    setImmediate(cb)
    return this.storage
  }
  var leveldb = this.level(options.path, options)
  this.storage = storage(leveldb, this.meta, cb)
  return this.storage
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(exists) {
    if (!exists) return cb("Error: You are not in a dat folder. " +
                           "Please run dat init.")
    cb()
  })
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
