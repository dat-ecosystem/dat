// assumes it will be used as a .prototype (e.g. uses `this`)

var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')
var events = require('events')
var http = require('http')
var level = require('level')
var sleepRef = require('sleep-ref')
var storage = require(path.join(__dirname, 'storage'))

var sleepPrefix = 'd'
var dbOptions = {
  valueEncoding: 'json'
}

var dat = {}
module.exports = dat

dat.paths = function(root) {
  root = root || process.cwd()
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
    newDat(cb)
  })
  
  function newDat(cb) {
    mkdirp(paths.dat, function (err) {
      if (err) return cb(err)
      newDB(cb)
    })
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
      db.close(function dbclose(err) {
        if (err) return cb(err)
        cb(false, "Initialized empty dat store at " + paths.dat)
      })
    }
  }
}

dat.help = function() {
  console.log('TODO')
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
      var server = http.createServer(function(req, res) {
        if (req.url === '/favicon.ico') return res.end()
        sleep.httpHandler(req, res)
      })
      var port = options.port || 6461
      server.listen(port, function(err) {
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
    console.log(data)
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
      if (val) store[op](key, {'val': val}, cb)
      else store[op](key, function(err, val) { cb(err, typeof val === 'undefined' ? val : JSON.stringify(val))})
    })
  })
}

dat._ensureExists = function(options, cb) {
  this.exists(options, function(err, exists) {
    if (err) return cb(err)
    if (!exists) return cb("Error: You are not in a dat folder")
    cb(false)
  })
}

dat._storage = function(options, cb) {
  var sleepdb = this.level(options.path)
  return storage(sleepdb, cb)
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
