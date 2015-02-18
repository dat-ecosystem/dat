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

  this._view = null
  this._branches = {}

  this.open = thunky(function (cb) {
    fs.exists(datPath, function (exists) {
      if (!exists && !opts.createIfMissing) return cb(new Error('No dat here'))

      mkdirp(datPath, function (err) {
        if (err) return cb(err)

        self.db = levelup(path.join(datPath, 'db'), {db: backend})
        self.log = hyperlog(subleveldown(self.db, 'hyperlog'))
        self._view = subleveldown(self.db, 'view')

        self.log.createChangesStream()
          .on('data', function (data) {
            var value = JSON.parse(data.value.toString())
            var set = value.dataset

            if (!set) return
            if (!self._branches[set]) self._branches[set] = {}

            data.links.slice(1).forEach(function (link) {
              delete self._branches[set][link.hash]
            })

            var prev = data.links.length && data.links[0]

            if (!prev || !self._branches[set][prev.hash]) {
              self._branches[set][data.hash] = {root: data, head: data, db: subleveldown(self._view, data.hash), changes: data.changes}
              return
            }

            self._branches[set][prev.hash].head = data
            self._branches[set][data.hash] = self._branches[set][prev.hash]
            delete self._branches[set][prev.hash]
          })
          .on('error', function (err) {
            cb(err)
          })
          .on('end', function () {
            cb(null, self)
          })
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

Dat.prototype.branches = function (name, cb) {
  this.open(function (err, dat) {
    if (err) return cb(err)
    if (!dat._branches[name]) return cb(new Error('Dataset does not exist'))

    cb(null, Object.keys(dat._branches[name]))
  })
}

Dat.prototype.dataset = function (name, branch) {
  return dataset(this, name, branch)
}

module.exports = Dat
