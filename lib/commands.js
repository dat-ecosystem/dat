// this module assumes it will be used as a .prototype (e.g. uses `this`)

var EOL = require('os').EOL
var fs = require('fs')
var path = require('path')
var events = require('events')
var http = require('http')
var zlib = require('zlib')
var bops = require('bops')
var through = require('through')
var mkdirp = require('mkdirp')
var extend = require('extend')
var request = require('request')
var level = require('level-hyper')
var untar = require('untar')
var sleepRef = require('sleep-ref')
var dirtar = require('dir-tar-stream')
var rimraf = require('rimraf')
var byteStream = require('byte-stream')
var combiner = require('stream-combiner')
var binaryCSV = require('binary-csv')
var multibuffer = require('multibuffer')
var mbstream = require('multibuffer-stream')
var split = require('binary-split')

var csvBuffEncoder = require(path.join(__dirname, 'csv-buff-encoder'))
var jsonBuffEncoder = require(path.join(__dirname, 'json-buff-encoder'))
var storage = require(path.join(__dirname, 'storage'))
var headStream = require(path.join(__dirname, 'head-stream'))
var jsonLogStream = require(path.join(__dirname, 'json-log-stream'))

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
  if (typeof options === 'string') options = {path: path}
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
  
  this.meta.package.init(options, function(err, data) {
    if (err) return cb(err)
    self.exists(options, function datExists(err, exists) {
      if (err) return cb(err)
      if (exists) return cb(false, "A dat store already exists at " + paths.dat)
      newDat(options, cb)
    })
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
    untar(paths.level, gunzip).node(function(err) {
      if (err) return cb(err)
      initStorage(cb)
    })
  }
  
  function localDB(dbPath, cb) {
    self.db = self.level(dbPath, options, function(err) {
      if (err) return cb(err)
      initStorage(cb)
    })
  }
  
  function initStorage(cb) {
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      cb(err, "Initialized empty dat store at " + paths.dat)
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
  if (this.db) return this.db
  if (!opts) opts = {}
  path = path || this.paths(path).level
  var db = level(path, extend({}, opts, dbOptions), cb)
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
      self._server = http.createServer(function(req, res) {
        if (req.url === '/favicon.ico') return res.end()
        if (req.url === '/_archive') {
          var backupName = +new Date()
          var backupPath = path.join(self.paths().level, 'backup-' + backupName)
          console.log('creating DB snapshot...')
          self.db.db.liveBackup(backupName, function(err) {
            if (err) return res.end(err.toString())
            var tarstream = dirtar(backupPath)
            console.log('starting tar generation...')
            console.time('generate tar')
            tarstream.on('end', function() {
              console.timeEnd('generate tar')
              rimraf(backupPath, function(err) {
                if (err) return console.error('rm backup', err)
              })
            })
            tarstream.pipe(res)
            
          })
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
  if (!cb) {
    cb = options
    options = {}
  }
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      var remote = options['0'] || 'http://127.0.0.1:6461'
      extend(options, { include_data: true })
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

dat.dump = function(options, cb) {
  if (!options) options = {}
  var lev = this.level(options.path)
  lev.createReadStream().pipe(jsonLogStream(cb))
}

dat.cat = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var store = self._storage(options, function(err, seq) {
      if (err) return cb(err)
      store.currentData().pipe(jsonLogStream(cb))
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

// TODO split this function up into modules
dat.createWriteStream = function(options) {
  if (typeof options === 'undefined') options = {}
  if (options.argv) options = options.argv
  
  // grab columns from options
  var columns = options.c || options.columns
  if (columns && !(columns instanceof Array)) columns = [columns]

  var self = this
  var store = self.storage
  var ended = false
  var writing = false
  
  if (Object.keys(options).indexOf('overwrite') === -1) {
    // if db is empty then use overwrite mode (faster)
    if (store.seq === 0) options.overwrite = true
  }
  
  var primary
  var primaryKeys = []
  var primaryIndex

  if (!options.overwrite) primary = '_id'
  if (options.primary) primary = options.primary
  
  if (primary) {
    var currentColumns = self.meta.json.columns.length ? self.meta.json.columns : columns
    if (currentColumns) primaryIndex = currentColumns.indexOf(primary)
    var onRow = function (row) {
      var primaryVal
      if (Array.isArray(row)) primaryVal = row[primaryIndex]
      else if (bops.is(row)) primaryVal = bufferAt(row, primaryIndex)
      else primaryVal = row[primary]
      primaryKeys.push(primaryVal)
      if (this.queue) this.queue(row)
    }
  }
  
  var batchStream = byteStream(dbOptions.writeBufferSize)
  var writeStream = through(onWrite, onEnd)
  var pipeChain = [batchStream, writeStream]

  if (options.csv || options.f == 'csv') {
    var delim = options.d || options.delim
    var csvParser = binaryCSV(delim)
    
    // grab first row of csv and store columns
    function onFirstCSV(buf) {
      var columns = csvParser.line(buf)
      for (var i = 0; i < columns.length; i++) columns[i] = csvParser.cell(columns[i])
      columns = columns.map(function(i) { return i.toString() })
      if (primary) { primaryIndex = columns.indexOf(primary) }
      var newColumns = self.meta.getNewColumns(columns)
      if (newColumns.length > 0) self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        if (primary) primaryIndex = self.meta.json.columns.indexOf(primary)
      })
    }
    
    pipeChain.unshift(csvBuffEncoder(onRow))
    pipeChain.unshift(headStream(onFirstCSV)) // skip first line of csv
    pipeChain.unshift(csvParser)
  } else if (options.json || options.f == 'json') {
    var newlineParser = split()
    var jsonEncoder = jsonBuffEncoder(store, onRow)
    
    function onFirstJSON(obj) {
      var newColumns = self.meta.getNewColumns(Object.keys(JSON.parse(obj)))
      if (newColumns.length > 0) {
        self.meta.addColumns(newColumns, function(err) {
          if (err) console.error('error updating columns', err)
          if (primary) primaryIndex = self.meta.json.columns.indexOf(primary)
        })
      }
    }
    
    pipeChain.unshift(jsonEncoder)
    pipeChain.unshift(headStream(onFirstJSON, {includeHead: true}))
    pipeChain.unshift(newlineParser)
  } else {
    // if no specific format is specified then assume .buff
    if (columns) {
      var newColumns = self.meta.getNewColumns(columns)
      if (newColumns.length > 0) {
        self.meta.addColumns(newColumns, function(err) {
          if (err) console.error('error updating columns', err)
        })
      }
    }
    
    if (primary) {
      var primaryExtractor = through(onRow)
      pipeChain.unshift(primaryExtractor)
    }

    pipeChain.unshift(mbstream.unpackStream())
  }
  
  return combiner.apply(combiner, pipeChain)
  
  function writeBatch(rows) {
    var batch = store.db.batch()
    var len = rows.length
    var pending = len
    if (pending > 0) writing = true
    for (var i = 0; i < len; i++) {
      var row = rows[i]
      var doc = {}
      if (row._rev) {
        doc._rev = row._rev
        row = row.buffer
      }
      if (primary) doc._id = primaryKeys.shift().toString()
      var meta = store.updateRevision(doc, row)
      if (!meta) {
        rows[i] = {success: true, row: doc}
        pending--
        if (pending === 0) commit()
        continue
      }
      var keys = store.rowKeys(meta._id, meta._seq, meta._rev)
      batch.put(keys.seq, [meta._seq, meta._id, meta._rev])
      batch.put(keys.row, row)
      rows[i] = {success: true, row: meta}
      pending--
      if (pending === 0) commit()
    }

    function commit() {
      if (batch.ops.length === 0) return next()
      
      batch.write(function(err) {
        if (err) console.error('batch write err', err)
        next()
      })
      
      function next() {
        writing = false
        for (var i = 0; i < len; i++) writeStream.queue(rows[i])
        batchStream.next()
        if (ended) writeStream.queue(null)        
      }
    }
  }
  
  function checkRows(rows, cb) {
    var len = rows.length
    var pending = len
    var results = []
    var errors = []
    
    for (var i = 0; i < len; i++) {
      var key = primaryKeys[i].toString()
      store.get(key, onRow)
    }
    
    function onRow(err, row) {
      results.push([err, row])
      pending--
      if (pending === 0) finish()
    }
    
    function finish() {
      for (var i = 0; i < results.length; i++) {
        var err = results[i][0]
        var row = results[i][1]
        var result = {}
        if (err && err.message !== 'range not found') {
          result.key = key
          result.error = err.message
          errors.push(result)
        }
        if (row) {
          result._rev = row._rev
          result.buffer = rows[i]
          rows[i] = result
        }
      }
      cb(errors.length > 0 ? errors : null, rows)
    }
  }
  
  function onWrite(rows) {
    if (options.overwrite) {
      writeBatch(rows)
    } else {
      checkRows(rows, function(errs, updatedRows) {
        if (errs) return console.error('fatal write errors', errs)
        writeBatch(updatedRows)
      })
    }
  }
  
  function onEnd() {
    ended = true
    if (!writing) writeStream.queue(null)
  }
}

dat.close = function() {
  if (this._server) this._server.close()
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(err, exists) {
    if (err) return cb(err)
    if (!exists) return cb("Error: You are not in a dat folder or are missing a package.json. Please run dat init again.")
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
  var store = this._storage(options, function(err, seq) {
    if (err) return cb(err)
    var sleepOpts = { style: "newline" }
    cb(false, sleepRef(function(opts) {
      return store.getSequences(opts)
    }, sleepOpts))
  })
}

function bufferAt(mb, idx) {
  var data = [null, mb]
  for (var i = 0; i < idx + 1; i++) data = multibuffer.readPartial(data[1])
  return data[0]
}
