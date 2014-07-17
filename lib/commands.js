// this module assumes it will be used as a .prototype (e.g. uses `this`)

var fs = require('fs')
var path = require('path')
var http = require('http')
var EOL = require('os').EOL
var events = require('events')

var bops = require('bops')

var read = require('read')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var extend = require('extend')
var request = require('request')
var corsify = require('corsify')
var levelup = require('levelup')
var ansimd = require('ansimd')
var sleepRef = require('sleep-ref')
var liveStream = require('level-live-stream')
var ldj = require('ldjson-stream')
var multibuffer = require('multibuffer')
var csvWriter = require('csv-write-stream')
var connections = require('connections')
var through = require('through2')
var clearLog = require('single-line-log')
var multilevel = require('multilevel/msgpack')
var stdout = require('stdout-stream')
var combiner = require('stream-combiner')
var replicator = require('dat-replicator')
var speedometer = require('speedometer')
var pretty = require('pretty-bytes')
var debug = require('debug')('dat.commands')

var clone = require('./clone.js')
var storage = require('./storage.js')
var blobs = require('./blobs.js')
var restHandler = require('./rest-handler.js')
var writeStream = require('./write-stream.js')
var getPort = require('./get-port.js')

var dat = {}

function noop(){}

module.exports = dat

dat.dbOptions = {
  writeBufferSize: 1024 * 1024 * 16 // 16MB
}

dat.defaultPort = 6461

dat.versionCmd = function() {
  console.log('dat version ' + this.version)
}

dat.paths = function(root) {
  root = root || this.dir || process.cwd()
  var datPath = path.join(root, '.dat')
  var levelPath = path.join(datPath, 'store.dat')
  var jsonPath = path.join(datPath, 'schema.json')
  var portPath = path.join(datPath, 'PORT')
  var blobsPath = path.join(datPath, 'objects')
  var packagePath = path.join(root, 'dat.json')

  return {
    dat: datPath,
    level: levelPath,
    json: jsonPath,
    port: portPath,
    blobs: blobsPath,
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
  
  var self = this
  var paths = this.paths(options.path)
  var json = {}

  fs.exists(paths.dat, function(exists) {
    if (exists) return cb(new Error("A dat store already exists here"))
    prompt(options, function(err) {
      if (err) return cb(err)
      self._mkdir(options, function(err) {
        if (err) return cb(err)
        fs.writeFile(path.join(paths.dat, '..', 'dat.json'), JSON.stringify(json, null, 2)+EOL, function(err) {
          if (err) return cb(err)
          initStorage(options, cb)
        })
      })
    })
  })
  
  function prompt(opts, cb) {
    if (!opts.prompt) return cb()

    ask([
      {name: 'name', default: path.basename(process.cwd())},
      {name: 'description'},
      {name: 'publisher'}
    ], cb)
  }

  function ask(prompts, cb) {
    if (!prompts.length) return cb()
    var p = prompts.shift()
    read({prompt: p.name+': ', default: p.default}, function(err, value) {
      if (err) return cb(err)
      if (value) json[p.name] = value
      ask(prompts, cb)
    })
  }

  function initStorage(opts, cb) {
    if (typeof opts === 'function') {
      cb = opts
      opts = options
    }
    self._storage(opts, function(err) {
      if (err) return cb(err)
      cb(err, "Initialized dat store at " + paths.dat)
    })
  }
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

dat.destroy = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  var self = this
  if (typeof options === 'string') options = {path: path}
  
  var paths = self.paths(options.path)
  
  if (this._pullTimeout) clearTimeout(this._pullTimeout)
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
  var help = fs.readFileSync(path.join(__dirname, '..', 'docs', 'usage.md'))
  
  console.log(ansimd(help))
  
  setImmediate(cb)
}

dat.getRowCount = function() {
  return this.meta.rowCount
}

dat.listen = function(options, cb) {
  var self = this
  
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  
  if (!options) options = {}
  
  if (typeof options === 'number' || typeof options === 'string') options = {port: options}
  
  // if already listening then return early w/ success callback
  if (this._server && this._server.address()) {
    setImmediate(function() {
      cb(null, 'Listening on port ' + self._server.address().port)
    })
    return
  }
  
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var restAPI = restHandler(self)
    self.cors = corsify({
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      "Access-Control-Allow-Headers": "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization"
      // todo add whitelist to options
    })
    self._server = http.createServer(self.cors(handle))
    self._server.on('connection', function(socket) {
      // makes rpc fast on ubuntu http://neophob.com/2013/09/rpc-calls-and-mysterious-40ms-delay/
      socket.setNoDelay()
    })
    function handle(req, res) {
      return restAPI.handle(req, res)
    }
    // TODO set socket timeout
    self.connections = connections(self._server)
    var startingPort = options.port || self.defaultPort
    getPort(startingPort, self.paths().port, function(err, port) {
      if (err) return cb(err)
      self._server.listen(port, function(err) {
        cb(err, 'Listening on port ' + port)
      })
    })
  })
}

dat.push = function(options, cb) {
  var self = this
  if (typeof options === 'string') options = {'remote': options}
  var remote = this._getRemote(options.remote)
  if (!remote) return cb(new Error('no remote specified'))

  if (options.attachments === false) options.blobs === false

  var pushStream = self.replicator.createPushStream(remote, options)
  
  if (options.results) {
    pushStream.pipe(self.resultPrinter())
  } else if (!options.quiet) {
    dat.progressLog(pushStream, 'Pushed', 'Push to remote has completed.')
  }
  
  pushStream.on('end', cb)
  pushStream.on('error', cb)
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
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    self._storage(options, function(err, store) {
      if (err) return cb(err, err.message)
      pull()
    })
  })

  var remote = this._getRemote(options['0'])
  
  if (options.attachments === false) options.blobs = false

  var pullObj = {
    end: function() {
      var currentPull = self.pulling[remote]
      if (currentPull && currentPull.end) currentPull.end()
    }
  }
  
  return pullObj
  
  function pull() {
    if (!self.pulling) self.pulling = {}
    if (self.pulling[remote]) return cb(new Error('Already pulling from that remote'))
    self.pulling[remote] = true
    
    createPullWriteStream()
    
    function retry() {
      if (self._pullTimeout) clearTimeout(self._pullTimeout)
      self._pullTimeout = setTimeout(pull, 5000)
    }

    function createPullWriteStream() {
      self.meta.pullSchema(remote, function(err) {
        if (err) {
          delete self.pulling[remote]
          return cb(err, "Could not get remote schema")
        }
        
        debug('pull', remote)
        
        var pullStream = self.replicator.createPullStream(remote, options)
        
        self.pulling[remote] = pullStream
        
        if (!options.quiet) dat.progressLog(pullStream, 'Pulled', 'Pulling from changes has completed.')
        
        pullStream.on('end', function() {
          delete self.pulling[remote]
          if (options.live) return retry()
          cb()
        })
        
        pullStream.on('error', function(err) {
          delete self.pulling[remote]
          // TODO better error handling
          console.log('pull err', err)
          if (options.live) retry()
        })
      })
    }
  }
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
  if (!remote) return cb(remoteErr, remoteErr.message)
  
  options.remote = this.normalizeURL(remote)
  
  if (typeof opts === 'function') {
    cb = opts
    opts = options
  }
  
  this._mkdir(options, function(err, exists) {
    if (err) return cb(err, err.message)
    
    // TODO add --force option to overwrite
    if (exists) return cb(new Error("Cannot clone into existing dat repo"))
    
    fs.writeFile(paths.package, JSON.stringify({remotes:{origin:options.remote}}, null, 2), function(err) {
      if (err) return cb(err, err.message)
      clone(self, options, function(err) {
        if (err) return cb(err, err.message)
        self._storage(options, function(err) {
          if (err) return cb(err, err.message)
          cb(err, "Loaded dat store at " + paths.dat)
        })
      })
    })
    
  })
}

dat.cat = function(options, cb) {
  if (!options) options = {}
  if (!cb) cb = noop
  if (!options.f && !options.json) options.json = true
  if (!this.db) {
    return cb(new Error('There is no dat here'))
  }
  var readStream = this.createValueStream(options)
  readStream.pipe(stdout)
  readStream.on('end', cb)
  readStream.on('error', cb)
}

dat.dump = function(options, cb) {
  if (!options) options = {}
  if (!cb) cb = noop
  var lev = this._level(options.path)
  var logger = ldj.serialize()
  lev.createReadStream().pipe(logger).pipe(stdout)
  logger.on('end', cb)
}

dat.headers = function(options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  var cols = this.schema.toJSON().map(function(col) {
    return col.name
  });

  var headers = ['key', 'version'].concat(cols)
  if (!cb) return headers
  cb(null, headers)
}

dat.get = function(key, opts, cb) {
  return this.storage.get(key, opts, cb)
}

dat.put = function(key, val, opts, cb) {
  return this.storage.put(key, val, opts, cb)
}

dat.delete = dat.del = function(key, opts, cb) {
  return this.storage.delete(key, opts, cb)
}

dat.createReadStream = dat.readStream = function(opts) {
  var self = this
  if (!opts) opts = {}
  var readStream = this._readStream(opts)

  return combiner(readStream, keyValueFormatter())
  
  function keyValueFormatter() {
    return through.obj(function(obj, enc, cb) {
      this.push({key: obj.key, value: obj})
      cb()
    })
  }
}

dat.createValueStream = dat.valueStream = function(opts) {
  var self = this
  if (!opts) opts = {}
  var readStream = this._readStream(opts)
  
  if (opts.csv || opts.format === 'csv') var formatter = csvWriteStream()
  else if (opts.json || opts.format === 'json') var formatter = ldj.serialize()
  
  // default to objects
  if (!formatter) return readStream
  else return combiner(readStream, formatter)
  
  function csvWriteStream() {
    var headers = self.headers()
    return csvWriter({headers: headers})
  }
}

dat.createKeyStream = dat.keyStream = function(opts) {
  var self = this
  if (!opts) opts = {}
  opts.keysOnly = true
  var readStream = this._readStream(opts)
  return readStream
}

dat.createChangesStream = function(opts) {
  return this.storage.createChangesStream(opts)
}

// todos:
// check for existing attachment by filename
// check for doc conflicts before writing blob to disk
// store filename, content-length, version?
// emit progress events
// resumable blob writes
dat.createBlobWriteStream = function(options, doc, cb) {
  var self = this
  
  if (typeof doc === 'function') {
    cb = doc
    doc = undefined
  }
  
  if (typeof doc === 'string') {
    doc = { key: doc }
  }
  
  if (typeof options === 'string') {
    options = { filename: options }
  }
  
  if (!doc) doc = {}
  if (!cb) cb = noop
  
  debug('createBlobWriteStream', options.filename)
  
  var blobWrite = this.blobs.createWriteStream(options, function(err, blob) {
    if (err) return cb(err)
    if (!doc.attachments) doc.attachments = {}
    doc.attachments[options.filename] = blob
    self.put(doc, function(err, stored) {
      cb(err, stored)
    })
  })
  
  return blobWrite
}


dat.createBlobReadStream = function(key, name, opts) {
  var self = this
  
  if (!opts) opts = {}
  
  var proxy = through()
  
  self.get(key, opts, function(err, doc) {
    if (err) return proxy.emit('error', err)
    if (!doc.attachments[name]) return proxy.emit('error', new Error('file is not attached to row'))
    
    var readStream = self.blobs.createReadStream(doc.attachments[name].hash)
    
    readStream.on('error', function(err) {
      proxy.emit('error', err)
    })
    
    readStream.pipe(proxy)
  })
  
  return proxy
}

dat.isOpen = function() {
  if (!this.db) return false
  return this.db.isOpen()
}

dat.isClosed = function() {
  if (!this.db) return true
  return this.db.isClosed()
}

dat.createWriteStream = dat.writeStream = function(options) {
  return writeStream(this, options)
}

dat.createVersionStream = function(key, options) {
  return this.storage.createVersionStream(key, options)
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

dat._level = function(dbPath, opts, cb) {
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
    self.rpcRequest = request.post(opts.remoteAddress + '/api/rpc')
    
    process.nextTick(function() {
      self.rpcRequest.req.on('socket', function(socket) {
        // makes rpc fast on ubuntu http://neophob.com/2013/09/rpc-calls-and-mysterious-40ms-delay/
        socket.setNoDelay()
      })  
    })
    
    self.rpcRequest.on('error', function(err) {
      debug('RPC request error', err.message)
    })
    
    self.rpcRequest.on('response', function(resp) {
      var code = resp.statusCode
      debug('rpc client response status', code)
      if (code < 299) return
      if (code === 401) console.error('RPC error ' + code + ' -- Invalid admin username/password')
      else console.error('RPC error', code)
      rpcStream.end()
    })
    
    rpcStream.pipe(self.rpcRequest).pipe(rpcStream)
    
    setImmediate(cb)
    
    return mdm
  }
  
  function localDb() {
    self.dbOptions.db = self.opts.backend || require('leveldown-prebuilt')
    
    var db = levelup(dbPath, self.dbOptions, cb)
    
    return db
  }

  function installAddons(db) {
    // db addons
    liveStream.install(db)
  }
}

dat._readStream = function(opts) {
  return this.storage.createReadStream(opts)
}

// initialize all storage related instances
dat._storage = function(options, cb) {
  var self = this
  var paths = this.paths(options.path)
  
  if (this.storage) {
    setImmediate(function() {
      cb(null, self.storage)
    })
    return
  }
  
  // custom backends must implement the same api as lib/<backend>
  var blobBackend = blobs
  if (options.blobs) blobBackend = options.blobs
  this.blobs = blobBackend(paths.blobs, options.hasher)
  
  var replicatorBackend = replicator
  if (options.replicator) replicatorBackend = options.replicator
  this.replicator = replicator(this, options)
  
  var leveldb = this._level(options.path, options, function onReady(err) {
    if (err) return cb(err)
    self.storage = storage(leveldb, self, function(err) {
      if (err) return cb(err)
      // init sleep handler
      self._sleep(options, function(err, sleep) {
        if (err) return cb(err)
        self.sleep = sleep
        self.schema = self.storage.schema
        cb(null, self.storage)
      })
    })
  })
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(exists) {
    if (!exists) return cb("Error: You are not in a dat folder.")
    cb()
  })
}

dat._getRemote = function(name) {
  var remotes = this.remotes || {}
  var remote = (name ? remotes[name] : remotes.origin) || name || 'http://127.0.0.1:' + this.defaultPort
  return this.normalizeURL(remote)
}

dat._sleep = function(options, cb) {
  var self = this
  this._storage(options, function(err, store) {
    if (err) return cb(err)
    var sleepOpts = { style: "newline" }
    cb(false, sleepRef(function(opts) {
      var changes = self.createChangesStream(opts)
      return changes
    }, sleepOpts))
  })
}

dat.config = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    cb(undefined, self.meta.json)
  })
}

dat.normalizeURL = function(urlString) {
  // strip trailing /
  if (urlString[urlString.length - 1] === '/') urlString = urlString.slice(0, urlString.length - 1)
  
  if (!urlString.match(/^http:\/\//)) urlString = 'http://' + urlString
  
  return urlString
}

dat.supportsLiveBackup = function() {
  // only leveldown-hyper has .liveBackup
  var leveldown = this.db.db
  if (!leveldown) return false
  var isHyper = !!leveldown.liveBackup
  return isHyper
}

dat.resultPrinter = function() {
  var results = through.obj(onResultWrite)
  function onResultWrite (obj, enc, next) {
    process.stdout.write(JSON.stringify(obj) + EOL)
    next()
  }
  return results
}

dat.progressLog = function(prog, verb, end) {
  verb = verb || 'Transferred'
  verb += '             '.slice(verb.length)

  var start = Date.now()
  var count = 0
  var elapsed = 0
  var speed = speedometer()
  var lastBytes = 0

  var pad = function(str) {
    if (str.length < 9) return str+'         '.slice(str.length)
    return str
  }

  var draw = function() {
    speed(prog.bytes - lastBytes)
    lastBytes = prog.bytes

    var runtime = Math.floor((Date.now() - start) / 1000)

    clearLog(
      'Elapsed      : '+runtime+' s\n'+
      verb+': '+pad(pretty(prog.bytes)) +' ('+pretty(speed())+'/s)'+ '\n'+
      (prog.documents >= 0 ? ' - documents : '+prog.documents+'\n' : '')+
      (prog.blobs >= 0 ?     ' - blobs     : '+prog.blobs+'\n'     : '')+
      (prog.conflicts >= 0 ? ' - conflicts : '+prog.conflicts+'\n' : '')
    )
  }

  var interval = setInterval(draw, 250)
  draw()
  prog.on('end', function() {
    draw()
    clearInterval(interval)
    if (end) console.log(end)
  })
}

