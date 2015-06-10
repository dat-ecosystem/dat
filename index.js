var pumpify = require('pumpify')
var through = require('through2')
var events = require('events')
var util = require('util')
var dat = require('dat-core')
var debug = require('debug')('dat')

module.exports = Dat

function Dat (args) {
  if (!(this instanceof Dat)) return new Dat(args)
  var self = this
  events.EventEmitter.call(this)

  if (!args) args = {path: process.cwd()}
  self.db = dat(args.path, {valueEncoding: 'json', createIfMissing: args.createIfMissing})
  if (args.checkout) self.db = self.db.checkout(args.checkout)

  self.db.on('error', function error (err) {
    // improve error messages
    if (err.message === 'No dat here') err.message = 'dat: This is not a dat repository, you need to dat init first'
    else err.message = 'dat: read error: ' + err.message
    self.emit('error', err)
  })
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.createImportStream = require('./src/import.js')
Dat.prototype.createExportStream = require('./src/export.js')
Dat.prototype.createDiffStream = require('./src/diff.js')
Dat.clone = require('./src/clone.js')
Dat.init = require('./lib/init-dat.js')

Dat.prototype.createFileWriteStream = function (key, opts) {
  if (!opts.dataset) throw new Error('Error: opts.dataset required.')
  return this.db.createFileWriteStream(key, opts)
}

Dat.prototype.createFileReadStream = function (key, opts) {
  if (!opts.dataset) throw new Error('Error: opts.dataset required')
  return this.db.createFileReadStream(key, opts)
}

Dat.prototype.datasets = function (cb) {
  return this.db.listDatasets(cb)
}

Dat.prototype.forks = function (cb) {
  this.db.heads()
    .on('data', function (data) {
      cb(null, data)
    })
    .on('error', function (err) {
      cb(err)
    })
}

Dat.prototype.checkout = function (head) {
  return this.db.checkout(head === 'latest' ? null : head, {persistent: true})
}

Dat.prototype.status = function (cb) {
  this.db.status(function (err, status) {
    if (err) return cb(err)
    cb(null, status)
  })
}
