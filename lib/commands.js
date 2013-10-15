// this module assumes it will be used as a .prototype (e.g. uses `this`)

var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')
var events = require('events')
var http = require('http')
var zlib = require('zlib')
var extend = require('extend')
var request = require('request')
var level = require('level-hyper')
var untar = require('untar')
var sleepRef = require('sleep-ref')
var dirtar = require('dir-tar-stream')
var rimraf = require('rimraf')
var through = require('through')
var byteStream = require('byte-stream')
var offset = require('offset-stream')
var combiner = require('stream-combiner')
var binaryCSV = require('binary-csv')
var mbstream = require('multibuffer-stream')
var csvBuffEncoder = require(path.join(__dirname, 'csv-buff-encoder'))
var jsonBuff = require(path.join(__dirname, '..', 'lib', 'json-buff'))
var split = require('binary-split')
var EOL = require('os').EOL
var storage = require(path.join(__dirname, 'storage'))

var sleepPrefix = 'd'
var dbOptions = {
  writeBufferSize: 1024 * 1024 * 16 // 16MB
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
  if (typeof options === 'function') {
    cb = options
    options = {}
  }
  if (typeof options === 'string') options = {path: path}
  var paths = this.paths(options.path)
  fs.exists(paths.dat, function datExists(exists) {
    if (!exists) return cb(false, false)
    fs.exists(paths.level, function levelExists(exists) {
      cb(false, exists)
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
  
  this.exists(options, function datExists(err, exists) {
    if (err) return cb(err)
    if (exists) return cb(false, "A dat store already exists at " + paths.dat)
    newDat(options, cb)
  })
  
  function newDat(options, cb) {
    mkdirp(paths.dat, function (err) {
      if (err) return cb(err)
      if (options.remote) remoteDB(options.remote, cb)
      else localDB(paths.level, cb)
    })
  }
  
  function remoteDB(remote, cb) {
    var targz = request(remote)
    var gunzip = zlib.createGunzip()
    targz.pipe(gunzip)
    untar(paths.level, gunzip).node(cb)
  }
  
  function localDB(dbPath, cb) {
    self.db = self.level(dbPath, options, function(err) {
      if (err) return cb(err)
      var store = self._storage(options, function(err, seq) {
        if (err) return cb(err)
        cb(err, "Initialized empty dat store at " + paths.dat)
      })
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
    rimraf(paths.dat, cb)
  }
}

dat.help = function() {
  fs.createReadStream(path.join(__dirname, '..', 'usage.md')).pipe(process.stdout)
}

dat.level = function(path, opts, cb) {
  if (this.db) return this.db
  if (!opts) opts = {}
  path = path || this.paths(path).level
  var db = level(path, extend({}, opts, dbOptions), cb)
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

dat.meta = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      cb(err, store.meta)
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
  if (typeof options === 'undefined') options = {}
  if (options.argv) options = options.argv
  var self = this
  var store = self.storage
  var ended = false
  var writing = false
  
  var batchStream = byteStream(dbOptions.writeBufferSize)
  var writeStream = through(onWrite, onEnd)
  var pipeChain = [batchStream, writeStream]
  
  if (options.csv || options.f && options.f == 'csv') {
    var csvParser = binaryCSV()
    
    // grab first row of csv and store headers as columns
    csvParser.once('data', function(buf) {
      var columns = csvParser.line(buf)
      for (var i = 0; i < columns.length; i++) columns[i] = csvParser.cell(columns[i])
      var newColumns = store.getNewColumns(columns.map(function(i) { return i.toString() }), store.meta.columns)
      if (newColumns.length > 0) store.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
      })
    })
    
    pipeChain.unshift(csvBuffEncoder())
    pipeChain.unshift(offset(1)) // skip first line of csv
    pipeChain.unshift(csvParser)
  } else {
    // if no specific format is specified then assume .buff
    
    // grab headers from options
    var headers = options.h || options.headers
    
    if (headers) {
      if (!(headers instanceof Array)) headers = [headers]
      var newColumns = store.getNewColumns(headers, store.meta.columns)
      if (newColumns.length > 0) {
        store.meta.columns = store.meta.columns.concat(newColumns)
        store.addColumns(newColumns, function(err) {
          if (err) console.error('error updating columns', err)
        })
      }
    }

    pipeChain.unshift(mbstream.unpackStream())
  }
  
  return combiner.apply(combiner, pipeChain)
  
  function onWrite(rows) {
    var batch = store.db.batch()
    var len = rows.length
    var pending = len
    if (pending > 0) writing = true
    for (var i = 0; i < len; i++) {
      var doc = {}
      var meta = store.updateRevision(doc)
      var keys = store.rowKeys(meta._id, meta._seq, meta._rev)
      batch.put(keys.seq, [meta._seq, meta._id, meta._rev])
      batch.put(keys.row, rows[i])
      rows[i] = {success: true, row: meta}
      pending--
      if (pending === 0) commit()
    }

    function commit() {
      batch.write(function(err) {
        writing = false
        if (err) console.error('batch write err', err)
        for (var i = 0; i < len; i++) {
          writeStream.queue(rows[i])
        }
        batchStream.next()
        if (ended) writeStream.queue(null)
      })
    }
  }
  
  function onEnd() {
    ended = true
    if (!writing) writeStream.queue(null)
  }
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
