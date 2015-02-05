var fs = require('fs')
var events = require('events')
var util = require('util')
var levelup = require('levelup')
var thunky = require('thunky')
var mkdirp = require('mkdirp')
var hyperlog = require('hyperlog')
var subleveldown = require('subleveldown')
var path = require('path')
var dataset = require('./lib/dataset')

var Dat = function (dir, opts) {
  if (!(this instanceof Dat)) return new Dat(dir, opts)
  if (!opts) opts = {}

  var self = this

  var backend = opts.backend || require('leveldown-prebuilt')
  var datPath = path.join(dir, '.dat')
  var levelPath = path.join(datPath, 'db')

  this.path = datPath
  this.db = null
  this.log = null

  this.open = thunky(function (cb) {
    fs.exists(datPath, function (exists) {
      if (!exists && !opts.createIfMissing) return cb(new Error('No dat here'))

      mkdirp(datPath, function (err) {
        if (err) return cb(err)

        self.db = levelup(path.join(datPath, 'db'), {db: backend})
        self.log = hyperlog(subleveldown(self.db, 'hyperlog'))

        cb(null, self)
      })
    })
  })
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.dataset = function(name) {
  return dataset(this, name)
}

module.exports = Dat
