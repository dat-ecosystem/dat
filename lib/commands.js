// assumes it will be used as a .prototype (e.g. uses `this`)

var level = require('level')
var mkdirp = require('mkdirp')
var fs = require('fs')
var path = require('path')

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
    self.open(paths.level, function dbopen(err, db) {
      if (err) return cb(err)
      db.close(function dbclose(err) {
        if (err) return cb(err)
        cb(false, "Initialized empty dat store at " + paths.dat)
      })
    })
  }
}

dat.help = function() {
  console.log('TODO')
}

dat.open = function(path, cb) {
  if (typeof path === 'string') {path: path}
  path = path || this.paths(path).levelpath
  var db = level(path, function levelopen(err) {
    if (err) return cb(err)
    cb(false, db)
  })
}
