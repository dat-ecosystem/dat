// this module assumes it will be used as a .prototype (e.g. uses `this`)

var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')
var events = require('events')
var http = require('http')
var zlib = require('zlib')
var request = require('request')
var level = require('level')
var untar = require('untar')
var sleepRef = require('sleep-ref')
var dirtar = require('dir-tar-stream')
var through = require('through')
var byteStream = require('byte-stream')
var combiner = require('stream-combiner')
var EOL = require('os').EOL
var storage = require(path.join(__dirname, 'storage'))

var sleepPrefix = 'd'
var dbOptions = {
  writeBufferSize: 1024 * 1024 * 4 // 4MB
}

var dat = {}
module.exports = dat

dat.paths = function(root) {
  root = root || this.dir || process.cwd()
  var datPath = path.join(root, '.dat')
  var levelPath = path.join(datPath, 'store.dat')
  return {
    dat: datPath,
    level: levelPath
  }
}

dat.exists = function(options, cb) {
  if (typeof path === 'string') {path: path}
  var paths = this.paths(options.path)
  fs.exists(paths.dat, function datExists(exists) {
    if (!exists) return cb(false, false)
    fs.exists(paths.level, function levelExists(exists) {
      cb(false, exists)
    })
  })
}

dat.init = function(options, cb) {
  var self = this
  var paths = this.paths(options.path)
  
  this.exists(options, function datExists(err, exists) {
    if (err) return cb(err)
    if (exists) return cb(false, "A dat store already exists at " + paths.dat)
    newDat(options, cb)
  })
  
  function newDat(options, cb) {
    mkdirp(paths.dat, function (err) {
      if (err) return cb(err)
      if (options.remote) remoteDB(options.remote, cb)
      else newDB(cb)
    })
  }
  
  function remoteDB(remote, cb) {
    var targz = request(remote)
    var gunzip = zlib.createGunzip()
    targz.pipe(gunzip)
    untar(paths.level, gunzip).node(cb)
  }
  
  function newDB(cb) {
    var db = self.db || self.level(paths.level)
    
    if (self.db.isOpen()) return close()

    db.on('open', close)
    
    db.once('error', function(e) {
      if (e.name !== 'OpenError') return
      cb(e)
    })
    
    function close() {
      if (!options.close) return cb(false, "Initialized empty dat store at " + paths.dat)
      db.close(function dbclose(err) {
        if (err) return cb(err)
        cb(false, "Initialized empty dat store at " + paths.dat)
      })
    }
  }
}

dat.help = function() {
  fs.createReadStream(path.join(__dirname, '..', 'usage.md')).pipe(process.stdout)
}

dat.level = function(path) {
  if (this.db) return this.db
  path = path || this.paths(path).level
  var db = level(path, dbOptions)
  this.db = db
  return db
}

dat.serve = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    self._sleep(options, function(err, sleep) {
      if (err) return cb(err)
      self._server = http.createServer(function(req, res) {
        if (req.url === '/favicon.ico') return res.end()
        if (req.url === '/_archive') {
          var tarstream = dirtar(self.paths().level)
          console.time('generate tar')
          tarstream.on('end', function() { console.timeEnd('generate tar') })
          tarstream.pipe(res)
          return
        }
        sleep.httpHandler(req, res)
      })
      var port = options.port || 6461
      self._server.listen(port, function(err) {
        cb(err, 'Listening on ' + port)
      })
    })
  })
}

dat.pull = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      var remote = options['0'] || 'http://127.0.0.1:6461'
      store.pull(remote, options, cb)
    })
  })
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

dat.dump = function(options) {
  var lev = this.level(options.path)
  lev.createReadStream().on('data', function(data) {
    process.stdout.write(JSON.stringify(data) + EOL)
  })
}

dat.cat = function(options) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      store.currentData().on('data', function(obj) {
        process.stdout.write(JSON.stringify(obj) + EOL)
      })
    })
  })
}

// debugging method
dat.crud = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var op = options[0]
    var key = options[1]
    var val = options[2]
    if (!op || !key) return cb(false, 'Must specify operation, key and optionally val as arguments')
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      if (val) {
        if (val[0] === '{') {
          val = JSON.parse(val)
          val['_id'] = key
          store[op](val, cb)
        } else {
          store[op]({'_id': key, 'val': val}, cb)
        }
      } else {
        store[op](key, function(err, val) { cb(err, typeof val === 'undefined' ? val : JSON.stringify(val))})
      }
    })
  })
}

dat.createWriteStream = function(options) {
  var self = this
  var store = self.storage
  var ended = false
  
  var batchStream = byteStream(dbOptions.writeBufferSize)
  var writeStream = through(onWrite, onEnd)
  
  return combiner(batchStream, writeStream)
  
  function onWrite(rows) {
    var batch = store.db.batch()
    var len = rows.length
    var pending = len
    for (var i = 0; i < len; i++) {
      var meta = store.updateRevision(rows[i])

      // update row with success message to be sent later (if not turned into error)

      var keys = store.rowKeys(meta.id, meta.seq, meta.rev)
      batch.put(keys.seq, [meta.seq, meta.id, meta.rev])
      batch.put(keys.row, rows[i])
      rows[i] = {success: true, row: meta}
      pending--
      if (pending === 0) commit()
    }

    function commit() {
      batch.write(function(err) {
        if (err) console.error('batch write err', err)
        for (var i = 0; i < len; i++) writeStream.queue(rows[i])
        batchStream.next()
        if (ended) writeStream.queue(null)
      })
    }
  }
  
  function onEnd() { ended = true }
}

dat._close = function() {
  if (this._server) this._server.close()
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(err, exists) {
    if (err) return cb(err)
    if (!exists) return cb("Error: You are not in a dat folder")
    cb(false)
  })
}

dat._storage = function(options, cb) {
  if (this.storage) {
    setImmediate(cb)
    return this.storage
  }
  var sleepdb = this.level(options.path)
  this.storage = storage(sleepdb, cb)
  return this.storage
}

dat._sleep = function(options, cb) {
  var store = this._storage(options, function(err, seq) {
    if (err) return cb(err)
    var sleepOpts = { style: "newline" }
    cb(false, sleepRef(function(opts) {
      return store.getSequences(opts)
    }, sleepOpts))
  })
}
