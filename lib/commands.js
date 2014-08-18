// this module assumes it will be used as a .prototype (e.g. uses `this`)

var fs = require('fs')
var path = require('path')
var http = require('http')
var EOL = require('os').EOL
var events = require('events')

var eos = require('end-of-stream')
var pump = require('pump')
var manifest = require('level-manifest')
var pumpify = require('pumpify')
var read = require('read')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var extend = require('extend')
var request = require('request')
var corsify = require('corsify')
var levelup = require('levelup')
var ansimd = require('ansimd')
var ldj = require('ldjson-stream')
var concat = require('concat-stream')
var csvWriter = require('csv-write-stream')
var connections = require('connections')
var through = require('through2')
var clearLog = require('single-line-log')
var multilevel = require('multilevel')
var stdout = require('stdout-stream')
var speedometer = require('speedometer')
var pretty = require('pretty-bytes')
var debug = require('debug')('dat.commands')
var ldat = require('level-dat')
var isNumber = require('isnumber')

var skimBlobs = require('./skim-blobs.js')
var restHandler = require('./rest-handler.js')
var writeStream = require('./write-stream.js')
var getPort = require('./get-port.js')
var docUtils = require('./document.js')
var schema = require('./schema')

var dat = {}

function noop(){}

module.exports = dat

dat.versionCmd = function() {
  console.log('dat version ' + this.version)
}

dat.paths = function(root) {
  root = root || this.dir || process.cwd()

  var datPath = path.join(root, '.dat')
  var levelPath = path.join(datPath, 'store.dat')
  var portPath = path.join(datPath, 'PORT')
  var blobsPath = path.join(datPath, 'objects')
  var packagePath = path.join(root, 'dat.json')

  return {
    dir: root,
    dat: datPath,
    level: levelPath,
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
      cb(exists)
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

    fs.exists(paths.package, function (jsonExists) {
      if(jsonExists) {
        if(!options.quit) console.log('Using existing dat.json found in this directory')
        self._mkdir(options, function (err) {
          if(err) return cb(err)
          initStorage(options, cb)
        })
      } else {
        initDatjson(paths.package, options, function (err) {
          if(err) return cb(err)
          initStorage(options, cb)
        })
      }
    })
  })

  function initDatjson(datjsonPath, opts, cb) {
    prompt(opts, function(err) {
      if (err) return cb(err)
        self._mkdir(options, function (err) {
          fs.writeFile(datjsonPath, JSON.stringify(json, null, 2)+EOL, cb)
        })
    })
  }
  
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
    checkExists()
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
  var help = fs.readFileSync(path.join(__dirname, '..', 'docs', 'cli-usage.md'))
  
  console.log(ansimd(help))
  
  setImmediate(cb)
}

dat.getRowCount = function(cb) {
  this.storage.stat(function(err, stat) {
    if (err) return cb(err)
    cb(null, stat.rows)
  })
}

dat.listen = function(options, cb) {
  var self = this
  
  if (typeof options === 'function') {
    cb = options
    options = {}
  }

  if (!cb) cb = noop
  if (!options) options = {}
  if (typeof options === 'number' || typeof options === 'string') options = {port: options}
  if (options[0] && !options.port) options.port = options[0]
  
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
    self.stats.http(self._server)
    function handle(req, res) {
      return restAPI.handle(req, res)
    }

    function listen(err) {
      if (err) return cb(err)
      var startingPort = options.port || self.options.port
      getPort(startingPort, self.paths().port, function(err, port) {
        if (err) return cb(err)
        debug('listen', port)

        self._server.listen(port, function(err) {
          cb(err, 'Listening on port ' + port)
        })
      })
    }

    // TODO set socket timeout
    self.connections = connections(self._server)
    self.listenHook(self, listen)
  })
}

dat.push = function(options, cb) {
  var self = this
  if (typeof options === 'string') options = {'remote': options}
  var remote = this._getRemote(options.remote)
  if (!remote) return cb(new Error('no remote specified'))
  if (self.options.skim) options.blobs = false

  var pushStream = self.replicator.createPushStream(remote, options)
  
  if (options.results) {
    pushStream.pipe(self.resultPrinter())
  } else if (!options.quiet) {
    dat.progressLog(pushStream, 'Pushed', 'Push to remote has completed.')
  }
  
  eos(pushStream, cb)
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

  if (self.options.skim) options.blobs = false

  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    self._storage(options, function(err, store) {
      if (err) return cb(err, err.message)
      pull()
    })
  })

  var remote = this._getRemote(options['0'])
  var destroyed = false

  var pullObj = {
    destroy: function() {
      this.end()
    },
    end: function() {
      destroyed = true
      var currentPull = self.pulling[remote]
      if (currentPull && currentPull.destroy) currentPull.destroy()
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
      debug('pull', remote)

      var pullStream = self.replicator.createPullStream(remote, options)

      self.pulling[remote] = pullStream

      if (!options.quiet) dat.progressLog(pullStream, 'Pulled', 'Pulling from changes has completed.')

      eos(pullStream, function(err) {
        delete self.pulling[remote]
        if (!destroyed && options.live) return retry()
        cb(err)
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
  
  self.options.remotes.origin = options.remote

  var datjson = {
    remotes: self.options.remotes
  }

  if (options.skim) {
    datjson.skim = true
    options.blobs = false
  }

  this._mkdir(options, function(err, exists) {
    if (err) return cb(err, err.message)

    fs.writeFile(paths.package, JSON.stringify(datjson, null, 2), function(err) {
      if (err) return cb(err, err.message)

      self._storage(extend({}, options, { path: self.paths().level }), function(err) {
        if (err) return cb(err, err.message)
        self.pull(options, cb)
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
  var readStream = this.createReadStream(options)
  readStream.pipe(stdout)
  eos(readStream, cb)
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

  var headers = ['key', 'version'].concat(this.schema.headers())
  if (!cb) return headers
  cb(null, headers)
}

dat.createStatsStream = function() {
  if (this.db.rpcServer) return pumpify(request(this.db.rpcServer +  '/api/stats'), ldj.parse())
  return this.stats.createStream()
}

// todos:
// check for existing blob by filename
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
    if (!doc.blobs) doc.blobs = {}
    doc.blobs[options.filename] = blob
    self.put(doc, {version:doc.version}, cb)
  })
  
  return blobWrite
}

dat.createBlobReadStream = function(key, name, opts) {
  var self = this
  
  if (!opts) opts = {}
  
  var proxy = through()
  
  self.get(key, opts, function(err, doc) {
    if (err) return proxy.emit('error', err)
    if (!doc.blobs || !doc.blobs[name]) return proxy.emit('error', new Error('file is not attached to row'))

    var readStream = self.blobs.createReadStream(doc.blobs[name])
    
    readStream.on('error', function(err) {
      proxy.emit('error', err)
    })
    
    proxy.on('close', function() {
      readStream.destroy()
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

dat.versions = function(key, options, cb) {
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  var versionStream = this.createVersionStream(key, options)
  versionStream.on('error', cb)
  versionStream.pipe(concat(gotVersions))
  
  function gotVersions(versions) {
    var result = versions
    if (result.length === 0) result = null
    cb(null, result)
  }
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
  
  this.stats.destroy()
  
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

  if (opts.remoteAddress) {
    this.db = remoteDb(opts)
    this.db.rpcServer = opts.remoteAddress
  } else {
    this.db = localDb()
    this.stats.level(this.db)
  }
  
  return this.db
  
  function remoteDb(opts) {
    var mdm = multilevel.client(manifest(ldat))
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

    mdm.stat(function(err, stat) {
      if (err) return cb(err)

      mdm.change = stat.change
      mdm.createChangesReadStream({live:true, data:true})
        .on('error', noop) // see above disconnect comment
        .on('data', function(data) {
          mdm.change = data.change
          mdm.emit('change', data)
        })

      cb()
    })
    
    return mdm
  }
  
  function localDb() {
    return levelup(dbPath, {db: self.options.leveldown}, cb)
  }
}

// initialize all storage related instances
dat._storage = function(options, cb) {
  var self = this

  if (this.storage) {
    setImmediate(function() {
      cb(null, self.storage)
    })
    return
  }

  var paths = this.paths(options.path)
  var backend = this.options.blobs

  if (options.skim) {
    backend = skimBlobs(backend, options.remote)
  }

  this.blobs = this.stats.blobs(backend)

  var leveldb = this._level(options.path, options, function onReady(err) {
    if (err) return cb(err)

    self.storage = leveldb.rpcServer ? leveldb : ldat(leveldb, {valueEncoding:'binary'})
    self.schema = schema(self.storage, function(err) {
      if (err) return cb(err)
      cb(null, self.storage)
    })

    self.replicator = self.options.replicator(self)
    events.EventEmitter.prototype.on.call(self.storage, 'change', function(change) { // .call is need to avoid multilevel warnings
      if (change.subset === 'internal' && change.key === 'schema') self.schema.compile(change.value.toString())
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
  var remotes = this.options.remotes
  var remote = (name ? remotes[name] : remotes.origin) || name || 'http://127.0.0.1:' + this.options.port
  return this.normalizeURL(remote)
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
    var stats = prog.stats || prog

    speed(stats.bytes - lastBytes)
    lastBytes = stats.bytes

    var runtime = Math.floor((Date.now() - start) / 1000)

    clearLog(
      'Elapsed      : '+runtime+' s\n'+
      verb+': '+pad(pretty(stats.bytes || 0)) +' ('+pretty(speed())+'/s)'+ '\n'+
      (stats.changes >= 0 ?   ' - changes : '+stats.changes+'\n' : '')+
      (stats.blobs >= 0 ?     ' - blobs   : '+stats.blobs+'\n'     : '')
    )
  }

  var interval = setInterval(draw, 250)
  draw()
  eos(prog, function(err) {
    draw()
    clearInterval(interval)
    if (err) clearLog.clear()
    else if (end) console.log(end)
  })
}

var decoder = function(dat) {
  return through.obj(function(data, enc, cb) {
    data = dat.schema.decode(data.value, {key:data.key, version:data.version})
    if (dat.afterGet) dat.afterGet(data, cb)
    else cb(null, data)
  })
}

var changesDecoder = function(dat) {
  return through.obj(function(data, enc, cb) {
    if (!data.value) return cb(null, data)

    if (data.subset === 'internal') data.value = data.value.toString()
    else data.value = dat.schema.decode(data.value, {key:data.key, version:data.version})

    cb(null, data)
  })
}

var changesEncoder = function(dat) {
  return through.obj(function(data, enc, cb) {
    if (!data.value || Buffer.isBuffer(data.value) || typeof data.value === 'string') return cb(null, data)

    data.value = dat.schema.encode(data.value)

    cb(null, data)
  })
}

dat.createChangesReadStream = function(opts) {
  if (opts && opts.decode) return pumpify.obj(this.storage.createChangesReadStream(opts), changesDecoder(this))
  return this.storage.createChangesReadStream(opts)
}

dat.createChangesWriteStream = function(opts) {
  if (opts && opts.encode) return pumpify.obj(changesEncoder(this), this.storage.createChangesWriteStream(opts))
  return this.storage.createChangesWriteStream(opts)
}

dat.createVersionStream = function(key, opts) {
  return pumpify.obj(this.storage.createVersionStream(key, opts), decoder(this))
}

dat.createWriteStream = function(opts) {
  return writeStream(this, opts)
}

dat.createReadStream = function(opts) {
  if (!opts) opts = {}

  var pipeline = [this.storage.createReadStream(opts), decoder(this)]

  if (opts.csv || opts.format === 'csv') pipeline.push(csvWriter({headers: this.headers()}))
  else if (opts.json || opts.format === 'json') pipeline.push(ldj.serialize())

  return pumpify.obj(pipeline)
}

dat.put = function(key, doc, opts, cb) {
  if (typeof key === 'object') return this.put(key.key, key, doc, opts)
  if (typeof opts === 'function') return this.put(key, doc, null, opts)
  if (!opts) opts = {}
  if (!cb) cb = noop

  var self = this
  var isBuffer = Buffer.isBuffer(doc)
  var version = opts.version || doc.version

  if (version) {
    if (!isNumber(version)) {
      setImmediate(function() {
        cb(new Error('version must be a number'))
      })
      return
    }
  }

  var afterMerge = function(err) {
    if (err) return cb(err)

    if (isBuffer && (!key || self.beforePut)) {
      isBuffer = false
      doc = self.schema.decode(doc)
    }

    if (!key && !isBuffer) key = docUtils.extractPrimaryKey(doc, opts)
    if (!key) throw new Error('put() requires a key')

    debug('put key: %s, version: %d', key, version || 0)

    var ready = function(err, doc) {
      if (err) return cb(err)

      self.storage.put(key, isBuffer ? doc : self.schema.encode(doc), {version:version, force:opts.force}, function(err, value, version) {
        if (err) return cb(err)
        cb(null, self.schema.decode(value, {key:key, version:version}))
      })
    }

    if (!self.beforePut) ready(null, doc)
    else self.beforePut(doc, ready)
  }

  if (opts.columns) this.schema.merge(opts.columns, opts, afterMerge)
  else if (isBuffer) afterWrite()
  else this.schema.mergeFromObject(doc, afterMerge)
}

dat.get = function(key, opts, cb) {
  if (typeof opts === 'function') return this.get(key, null, opts)
  if (!opts) opts = {}

  var self = this

  this.storage.get(key, opts, function(err, value, version) {
    if (err) return cb(err)
    var val = self.schema.decode(value, {key:key, version:version, blobsOnly:opts.blobsOnly})
    if (self.afterGet) self.afterGet(val, cb)
    else cb(null, val)
  })
}

dat.delete =
dat.del = function(key, opts, cb) {
  if (typeof opts === 'function') return this.storage.del(key, opts)
  this.storage.del(key, opts, cb)
}
