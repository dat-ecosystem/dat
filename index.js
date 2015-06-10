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

Dat.prototype.createImportStream = function (opts) {
  if (!opts.dataset) throw new Error('Error: Must specify dataset (-d)')
  var self = this

  var transform = through.obj(function (obj, enc, next) {
    debug('heres my obj!', obj)
    var key = obj[opts.key] || obj.key || uuid()
    next(null, {type: 'put', key: key, value: obj})
  })

  var writeStream = self.db.createWriteStream({
    message: opts.message,
    dataset: opts.dataset,
    transaction: true
  })

  return pumpify(parseInputStream(opts), transform, writeStream)
}

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
    // dat-core calls it head, we wanna call it version instead
    status.version = status.head
    delete status.head
    cb(null, status)
  })
}

Dat.prototype.createDiffStream = function (headA, headB, opts) {
  var diffStream = this.db.createDiffStream(headA, headB)

  function datDiffFormatter () {
    return through.obj(function write (obj, enc, next) {
      var a = obj[0]
      var b = obj[1]
      var diff = {}
      if (a) diff.key = a.key
      if (b) diff.key = b.key

      if (opts.dataset) {
        if (a && a.dataset !== opts.dataset) return next(null, null)
        if (b && b.dataset !== opts.dataset) return next(null, null)
      }

      diff.forks = [headA, headB]
      diff.versions = []
      if (a) {
        diff.versions.push(a)
      } else {
        diff.versions.push(null)
      }
      if (b) {
        diff.versions.push(b)
      } else {
        diff.versions.push(null)
      }
      next(null, diff)
    })
  }
  return pumpify.obj(diffStream, datDiffFormatter())
}