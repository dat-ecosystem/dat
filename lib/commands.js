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
var corsify = require('corsify')
var levelup = require('levelup')
var sleepRef = require('sleep-ref')
var liveStream = require('level-live-stream')
var levelBackup = require('hyperlevel-backup')
var ldj = require('ldjson-stream')
var jsonBuffStream = require('json-multibuffer-stream')
var multibuffer = require('multibuffer')
var csvWriter = require('csv-write-stream')
var connections = require('connections')
var sublevel = require('sublevel')
var through = require('through2')
var version = require("level-version")
var multilevel = require('multilevel/msgpack')
var debug = require('debug')('dat.commands')

var clone = require(path.join(__dirname, 'clone'))
var storage = require(path.join(__dirname, 'storage'))
var restHandler = require(path.join(__dirname, 'rest-handler'))
var writeStream = require(path.join(__dirname, 'write-stream'))
var getPort = require(path.join(__dirname, 'get-port'))

var dat = {}

function noop(){}

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

dat.clone = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  
  var self = this
  
  // TODO make clone actually respect path
  var paths = this.paths(options.path)
  
  var remote
  if (typeof options === 'string') remote = options
  else remote = options.remote || options[0]
  var remoteErr = new Error('Must specify remote!')
  if (!remote) cb(remoteErr, remoteErr.message)
  
  if (typeof opts === 'function') {
    cb = opts
    opts = options
  }
  
  this._mkdir(options, function(err, exists) {
    if (err) return cb(err, err.message)
    
    // TODO add --force option to overwrite
    if (exists) return cb(new Error("Cannot clone into existing dat repo"))
    
    clone(self, remote, function(err) {
      if (err) return cb(err, err.message)
      self._storage(options, function(err, seq) {
        if (err) return cb(err, err.message)
        cb(err, "Loaded dat store at " + paths.dat)
      })
    })
    
  })
}

dat._mkdir = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  
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
    self.exists(options.path, function datExists(exists) {
      cb(null, exists)
    })
  }
  
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

  this._mkdir(options, function(err, exists) {
    if (err) return cb(err)
    if (exists) return cb(new Error("A dat store already exists here"))
    
    self.level(paths.level, options, function(err) {
      if (err) return cb(err)
      initStorage(cb)
    })
  })
  
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
  var self = this
  if (typeof options === 'string') options = {path: path}
  
  var paths = self.paths(options.path)
  
  this.close(function(err) {
    if (err) return cb(err)
    destroyDB()
  })
  
  function destroyDB() {
    rimraf(paths.dat, cb)
  }
}

dat.help = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  var readStream = fs.createReadStream(path.join(__dirname, '..', 'usage.md'))
  readStream.pipe(process.stdout)
  readStream.on('end', cb)
  readStream.on('error', cb)
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
      cb(null, 'Listening on http://localhost:' + self._server.address().port)
    })
    return
  }
  
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    self._sleep(options, function(err, sleep) {
      if (err) return cb(err)
      var restAPI = restHandler(self)
      self.cors = corsify({
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE"
        // todo add whitelist to options
      })
      self._server = http.createServer(self.cors(handle))
      function handle(req, res) {
        if (req.url.match(/^\/favicon.ico/)) return res.end()
        if (req.url.match(/^\/_archive/)) return levelBackup(self.db.db, {dir: self.paths().level}, res)
        if (req.url.match(/^\/_changes/)) return sleep.httpHandler(req, res)
        return restAPI.handle(req, res)
      }
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
    var serializer = through.obj(function write(obj, enc, next) {
      this.push(JSON.stringify(obj.data) + '\n')
      next()
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
      if (err) return cb(err, err.message)
      var remote = options['0'] || 'http://127.0.0.1:' + self.defaultPort
      if (!self.pulling) self.pulling = {}
      if (self.pulling[remote]) return cb(new Error('Already pulling from that remote'))
      self.pulling[remote] = true
      self.meta.pullSchema(remote, function(err) {
        if (err) {
          delete self.pulling[remote]
          return cb(err, "Could not get remote schema")
        }
        // TODO merge schema + handle conflicts
        extend(options, { include_data: true })
        debug('pull', remote + '/_changes')
        var pullStream = store.createPullStream(remote + '/_changes', options)
        pullStream.remote = remote
        obj.stream = pullStream
        var writeStream = self.createWriteStream({ objects: true, overwrite: false, batchTime: 250 })
        pullStream.pipe(writeStream)
        writeStream.on('end', function() {
          delete self.pulling[remote]
          cb()
        })
        writeStream.on('error', function(err) {
          // TODO better error handling
          console.log('pull err', err)
        })
      })
    })
  })
  return obj
}

dat.cat = function(options, cb) {
  if (!options) options = {}
  if (!cb) cb = noop
  var logger = ldj.serialize()
  var readStream = this.createReadStream()
  readStream.pipe(logger).pipe(process.stdout)
  readStream.on('end', cb)
  readStream.on('error', cb)
}

dat.dump = function(options, cb) {
  if (!options) options = {}
  if (!cb) cb = noop
  var lev = this.level(options.path)
  var logger = ldj.serialize()
  lev.createReadStream().pipe(logger).pipe(process.stdout)
  logger.on('end', cb)
}

dat.headers = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  var headers = ['_id', '_rev'].concat(this.meta.json.columns)
  if (!cb) return headers
  cb(null, headers)
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
  var self = this
  if (!opts) opts = {}
  var readStream = this.storage.createReadStream(opts)
  
  if (opts.csv || opts.f === 'csv') var formatter = csvWriteStream()
  else if (opts.buff || opts.f === 'buff') var formatter = buffStream()
  else if (opts.json || opts.f === 'json') var formatter = ldj.serialize()

  // default to objects
  if (!formatter) return readStream
  
  readStream.pipe(formatter)
  return formatter
  
  function csvWriteStream() {
    var headers = self.headers()
    return csvWriter({headers: headers})
  }
  
  function buffStream() {
    var headers = self.headers()
    var encoder = jsonBuffStream(headers)
    var obj = {}
    headers.map(function(h) { obj[h] = h })
    encoder.write(obj)
    return encoder
  }
}

dat.createChangesStream = function(opts) {
  return this.storage.createChangesStream(opts)
}

dat.createWriteStream = function(options) {
  return writeStream(this, options)
}

dat.createVersionStream = function(id, options) {
  return this.storage.createVersionStream(id, options)
}

dat.close = function(cb) {
  var self = this
  if (!cb) cb = noop
  
  if (this.rpcRequest) this.rpcRequest.end()
  
  if (this.db) {
    this.db.close(function(err) {
      if (err) return cb(err)
      closeServer()
    })
  } else {
    closeServer()
  }
  
  function closeServer() {
    if (self._server) {
      self.connections.destroy()
      try {
        self._server.close(rmPort)
      } catch(e) {
        rmPort()
      }
    } else {
      setImmediate(cb)
    }
  }
  
  function rmPort() {
    fs.unlink(self.paths().port, function(err) {
      // ignore err
      cb()
    })
  }
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
  this.dbOptions = extend({}, this.dbOptions, opts)
  
  if (opts.remoteAddress) {
    this.db = remoteDb(opts)
    this.db.rpcServer = opts.remoteAddress
  } else {
    this.db = localDb()
  }
  
  installAddons(this.db)
  
  return this.db
  
  function remoteDb(opts) {
    var mdm = multilevel.client(opts.manifest)
    var rpcStream = mdm.createRpcStream()

    // TODO auto-reconnect
    self.rpcRequest = request.post(opts.remoteAddress + '/_rpc')

    rpcStream.pipe(self.rpcRequest).pipe(rpcStream)
    return mdm
  }
  
  function localDb() {
    var backend = self.meta.json.backend
    if (backend && backend !== "leveldown") {
      self.dbOptions.db = require(path.resolve(self.paths().dat, 'node_modules', backend))
    } else {
      self.dbOptions.db = require('leveldown')
    }

    var db = levelup(dbPath, self.dbOptions, cb)
    return db
  }

  function installAddons(db) {
    // db addons
    liveStream.install(db)
  }
}

dat.backend = function(options, cb) {
  var self = this
  var setTo

  if (typeof options === 'string') setTo = options
  else setTo = options[0]
  
  if (setTo) return this._backend.set(setTo, function(err) {
    if (err) return cb(err, err)
    cb(null, "Switched backend to " + setTo)
  })

  this._backend.installed(function(err, installed) {
    if (err) return cb(err)
    var installed = Object.keys(installed)
    if (!installed) installed = ['leveldown']
    else installed.push('leveldown')
    var result = {
      available: installed
    }
    var current = self.meta.json.backend
    if (!current) result.current = 'leveldown'
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
      var changes = self.createChangesStream(opts)
      return changes
    }, sleepOpts))
  })
}
