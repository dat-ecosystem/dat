var pumpify = require('pumpify')
var through = require('through2')
var events = require('events')
var util = require('util')
var uuid = require('cuid')
var dat = require('dat-core')
var debug = require('debug')('dat')
var parseInputStream = require('./lib/parse-input-stream.js')

module.exports = Dat

function Dat (args) {
  if (!(this instanceof Dat)) return new Dat(args)
  var self = this

  events.EventEmitter.call(this)

  if (!args) args = {path: process.cwd()}
  self.db = dat(args.path, {valueEncoding: 'json'})
  if (args.checkout) self.db = self.db.checkout(args.checkout)

  self.db.on('error', function error (err) {
    // improve error messages
    if (err.message === 'No dat here') err.message = 'dat: This is not a dat repository, you need to dat init first'
    else err.message = 'dat: read error: ' + err.message
    self.emit('error', err)
  })
}

util.inherits(Dat, events.EventEmitter)

Dat.prototype.createImportStream = function (args) {
  var self = this

  var transform = through.obj(function (obj, enc, next) {
    debug('heres my obj!', obj)
    var key = obj[args.key] || obj.key || uuid()
    next(null, {type: 'put', key: key, value: obj})
  })

  var writeStream = self.db.createWriteStream({
    message: args.message,
    dataset: args.dataset,
    transaction: true
  })

  return pumpify(parseInputStream(args), transform, writeStream)
}

Dat.prototype.createWriteStream = function (key, opts) {
  return this.db.createFileWriteStream(key, opts)
}

Dat.prototype.datasets = function (cb) {
  return this.db.listDatasets(cb)
}
