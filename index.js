var fs = require('fs')
var events = require('events')
var util = require('util')
var levelup = require('levelup')
var thunky = require('thunky')
var mkdirp = require('mkdirp')
var hyperlog = require('hyperlog')
var subleveldown = require('subleveldown')
var path = require('path')
var duplexify = require('duplexify')
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

Dat.prototype.createPullStream = function () {
  return this.createSyncStream({mode: 'pull'})
}

Dat.prototype.createPushStream = function () {
  return this.createSyncStream({mode: 'push'})
}

Dat.prototype.createSyncStream = function (opts) {
  if (!opts) opts = {}

  var mode = opts.mode || 'sync'
  if (this.log) return this.log.createReplicationStream({mode: mode})
  var proxy = duplexify()

  this.open(function (err, dat) {
    if (err || proxy.destroyed) return proxy.destroy(err)
    var repl = dat.log.createReplicationStream({mode: mode})
    proxy.setReadable(repl)
    proxy.setWritable(repl)
  })

  return proxy
}

Dat.prototype.heads = function (name, cb) {
  this.open(function (err, dat) {
    if (err) return cb(err)

    var heads = []
    var changes = dat.log.createChangesStream()

    changes.on('data', function (data) {
      if (dataset.decode(data.value).dataset !== name) return

      data.links.forEach(function (link) {
        var i = heads.indexOf(link.hash)
        if (i > -1) heads.splice(i, 1)
      })

      heads.push(data.hash)
    })

    changes.on('error', function (err) {
      cb(err)
    })

    changes.on('end', function () {
      cb(null, heads)
    })
  })
}

Dat.prototype.dataset = function (name) {
  return dataset(this, name)
}

module.exports = Dat
