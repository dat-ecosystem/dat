// assumes it will be used as a .prototype (e.g. uses `this`)

var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')
var events = require('events')
var http = require('http')
var level = require('level')
var levelSleep = require('level-sleep')
var sublevel = require('level-sublevel')

var sleepPrefix = 'd'
var sleepDbOptions = {
  keyEncoding: 'binary',
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
  var db = level(path)
  this.db = sublevel(db)
  return this.db
}

dat.serve = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var sleep = self._sleep(options)
    var server = http.createServer(function(req, res) {
      if (req.url === '/favicon.ico') return res.end()
      sleep.httpHandler(req, res)
    })
    server.listen(options.port || 6461)
  })
}

dat.pull = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var sleepdb = self.level(options.path).sublevel(sleepPrefix, sleepDbOptions)
    var store = levelSleep(sleepdb)
    var remote = options['0'] || 'http://127.0.0.1:6461'
    store.get(sleepPrefix, function(err, db) {
      if (err) return cb(err)
      db.pull(remote, options, cb)
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
dat.pizza = function(options, cb) {
  var self = this
  this._ensureExists(options, function exists(err) {
    if (err) return cb(false, err)
    var op = options[0]
    var key = options[1]
    var val = options[2]
    if (!op || !key) return cb(false, 'Must specify operation, key and optionally val as arguments')
    var sleepdb = self.level(options.path).sublevel(sleepPrefix, sleepDbOptions)
    var store = levelSleep(sleepdb)
    store.get(sleepPrefix, function(err, db) {
      if (err) return cb(err)
      if (val) db[op](key, val, cb)
      else db[op](key, cb)
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

dat._sleep = function(options) {
  var sleepdb = this.level(options.path).sublevel(sleepPrefix, sleepDbOptions)
  var db = levelSleep(sleepdb)
  var sleepOpts = { style: "newline" }
  return sleepRef(function(opts, cb) {
    return db.getSequences(opts)
  }, sleepOpts)
}
