// this file is adapted from mikeal/level-sleep/index.js
// this is intended to be a strawman implementation
// everything here is subject to change

var util = require('util')
var events = require('events')
var mutex = require('level-mutex')
var sleep = require('sleep-ref')
var through = require('through')
var path = require('path')
var lexint = require('lexicographic-integer')
var monot = require("monot")
var extend = require('extend')
var crypto = require('crypto')
var bops = require('bops')
var jsonbuff = require(path.join(__dirname, '..', 'lib', 'json-buff'))

function noop() {}

// example: ÿdÿffe33ee5ÿrÿfc0148ÿsÿ01
function decodeKey(key) {
  var parts = key.split('ÿ')
  var revs = parts[4].split('-')
  return {
    '_id': parts[2],
    '_rev': lexint.unpack(revs[0], 'hex') + '-' + revs[1],
    '_seq': lexint.unpack(parts[6], 'hex')
  }
}

// example: 1294,efbd8c3d,1-ae33i23inb5bsbcv
function decodeSeq(key) {
  var parts = key.split(',')
  return {
    '_seq': +parts[0],
    '_id': parts[1],
    '_rev': parts[2]
  }
}

function hash(doc, rowBuffer, columns) {
  if (!rowBuffer) {
    if (doc._rev) {
      var rev = doc._rev
      delete doc._rev
    }
    if (doc._id === 'meta') rowBuffer = JSON.stringify(doc)
    else rowBuffer = jsonbuff.encode(doc, columns)
  }
  var hash = crypto.createHash('md5').update(rowBuffer).digest("hex")
  if (rev) {
    doc._rev = rev
  }
  return hash
}

module.exports = Database

function Database (db, cb) {
  if (!(this instanceof Database)) return new Database(db, cb)
  var self = this
  
  this.db = db
  self.timestamp = monot()
  this.mutex = mutex(this.db)
  this.sep = '\xff'
  this.reserved = ['_id', '_seq', '_rev']
  this.keys = {
    seq:  's',
    data: 'd',
    rev:  'r'
  }

  self.getSeq(function(err, seq) {
    if (err) {
      self.seq = 0
      return getMeta(cb)
    }
    self.seq = seq
    getMeta(cb)
  })
  
  function getMeta(cb) {
    self.get('meta', {valueEncoding: 'json'}, function(err, meta) {
      if (err) return createMeta(cb)
      self.meta = meta
      cb()
    })
  }
  
  function createMeta(cb) {
    self.meta = { _id: 'meta', created: new Date(), columns: [] }
    self.put(self.meta, {valueEncoding: 'json'}, function(err) {
      if (err) return cb(err)
      self.get('meta', {valueEncoding: 'json'}, function(err, meta) {
        if (err) return cb(err)
        self.meta = meta
        cb()
      })
    })
  }
}

util.inherits(Database, events.EventEmitter)

// TODO benchmark + review various uuid options
Database.prototype.uuid = function() {
  var stamper = new this.timestamp()
  return stamper.toISOString() + '-' + Math.random().toString(16).slice(2)
}

Database.prototype._key = function(sublevel, key) {
  return this.sep + sublevel + this.sep + key
}

Database.prototype.getSeq = function(cb) {
  var opts = { 
    start: this._key(this.keys.seq, ''),
    end: this._key(this.keys.seq, this.sep)
  }
  this.mutex.peekLast(opts, function (e, key, val) {
    if (e) return cb(e)
    return cb(false, decodeSeq(val)._seq)
  })
}

Database.prototype.addColumns = function(columns, cb) {
  var self = this
  if (!(columns instanceof Array)) columns = [columns]
  this.get('meta', {valueEncoding: 'json'}, function(err, meta) {
    if (err) return cb(err)
    meta.columns = meta.columns.concat(columns)
    self.meta = meta
    self.put(meta, {valueEncoding: 'json'}, cb)
  })
}

Database.prototype.currentData = function() {
  var stream = through()
  var self = this
  
  var beginningKey = ''
  proceed(beginningKey)
  
  return stream
  
  function proceed(fromKey) {
    getNext(fromKey, function(err, row) {
      if (err) return stream.end()
      if (row._id === 'meta') return proceed(row._id)
      stream.queue(row)
      proceed(row._id)
    })
  }
  
  function getNext(key, cb) {
    var startKey = self._key(self.keys.data, key ? key + self.sep + self.sep : key)
    var endKey = self._key(self.keys.data, self.sep)
    var opts = {start: startKey, end: endKey, valueEncoding: 'binary'}
    self.mutex.peekFirst(opts, function (e, key, value) {
      if (e) return cb(new Error('not found.'))
      var decoded = decodeKey(key)
      if (decoded._id === 'meta') return cb(null, decoded)
      value = jsonbuff.decode(self.meta.columns, value)
      var doc = extend(decoded, value)
      cb(null, doc)
    })
  }
}

Database.prototype.updateRevision = function(doc, rowBuffer) {
  var id = doc._id
  if (typeof id !== 'string') id = this.uuid()
  var prev = 0, nextHash
  if (doc._rev) {
    var revParts = doc._rev.split('-')
    prev = +revParts[0]
    var prevHash = revParts[1]
    nextHash = hash(doc, rowBuffer, this.meta.columns)
    if (prevHash === nextHash) return doc // doc didnt change
  }
  if (!nextHash) nextHash = hash(doc, rowBuffer, this.meta.columns)
  var rev = prev + 1 + '-' + nextHash
  var seq = this.seq = this.seq + 1
  return extend({}, doc, {_rev: rev, _seq: seq, _id: id})
}

Database.prototype.rowKeys = function(id, seq, rev) {
  var seqKey = this._key(this.keys.seq, lexint.pack(seq, 'hex'))
  var revParts = rev.split('-')
  var revNum = +revParts[0]
  return {
    seq: seqKey,
    row: this._key(this.keys.data, id + this._key(this.keys.rev, lexint.pack(revNum, 'hex') + '-' + revParts[1]) + seqKey)
  }
}

Database.prototype.getNewColumns = function (a, b) {
  var newColumns = []
  for (var y = 0; y < a.length; y++) {
    if (this.reserved.indexOf(a[y]) > -1) continue
    var exists = false
    for (var x = 0; x < b.length; x++) {
      if (b[x] === a[y]) {
        exists = true
        continue
      }
    }
    if (!exists && newColumns.indexOf(a[y]) === -1) {
      newColumns.push(a[y])
    }
  }
  return newColumns
}

Database.prototype.get = function (key, opts, cb) {
  var self = this
  
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  
  var isJSON = false
  if (opts.valueEncoding && opts.valueEncoding === 'json') isJSON = true
  if (!isJSON) opts.valueEncoding = 'binary'
  
  var revKey = ''
  if (opts.rev) {
    var revParts = opts.rev.split('-')
    revKey = self._key(this.keys.rev, lexint.pack(+revParts[0], 'hex') + '-' + revParts[1])
  }
  var rowKey = self._key(this.keys.data, key + revKey)

  extend(opts, {
    start: rowKey,
    end: rowKey + this.sep + this.sep
  })

  this.mutex.peekLast(opts, function (e, k, v) {
    if (e) return cb(e)
    if (!isJSON) v = jsonbuff.decode(self.meta.columns, v)
    cb(null, extend(decodeKey(k), v))
  })
}

// .put(obj, buff, opts, cb)
// .put(buff, opts, cb)
// .put(obj, buff, cb)
// .put(obj, opts, cb)
// .put(buff, cb)

Database.prototype.put = function (rawDoc, buffer, opts, cb) {
  var self = this
  var doc = rawDoc
  
  if (bops.is(rawDoc)) {
    cb = opts
    opts = buffer
    buffer = rawDoc
    doc = {}
    rawDoc = undefined
  }
  
  if (!bops.is(buffer)) {
    cb = opts
    opts = buffer
    buffer = undefined
  } else {
    doc = {}
  }
  
  if (!cb) {
    cb = opts
    opts = {}
  }
  
  if (!opts.overwrite) doc = this.updateRevision(doc, buffer)
  var keys = this.rowKeys(doc._id, doc._seq, doc._rev)
  
  var isJSON = false
  if (opts.valueEncoding && opts.valueEncoding === 'json') isJSON = true
  if (!isJSON) opts.valueEncoding = 'binary'
  if (isJSON) return store()
  
  var columns = Object.keys(doc)
  if (opts.columns) columns = columns.concat(opts.columns)
  var newColumns = this.getNewColumns(columns, this.meta.columns)
  if (newColumns.length === 0) return store()
  
  self.addColumns(newColumns, function(err) {
    if (err) return cb(err)
    store()
  })
  
  function store() {
    if (!buffer && isJSON) buffer = doc
    if (!buffer) buffer = jsonbuff.encode(doc, self.meta.columns)
    self.mutex.put(keys.seq, [doc._seq, doc._id, doc._rev], noop)
    self.mutex.put(keys.row, buffer, opts, function (e) {
      if (e) return cb(e)
      cb(null, doc)
    })
  }
}

Database.prototype.del = function (key, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  this.seq += 1
  var seq = this.seq
  this.mutex.put(this._key(this.keys.seq, lexint.pack(seq, 'hex')), {_deleted: true, _id: key, _seq: seq}, opts, noop)
  this.mutex.put(this._key(this.keys.data, key), {_deleted: true, _seq: seq}, opts, function (e) {
    if (e) return cb(e)
    cb(null, seq)
  })
}

Database.prototype.getSequences = function (opts) {
  if (!opts) opts = {}
  opts.since = +opts.since || 0
  opts.limit = +opts.limit || -1
  var pending = []
  var self = this
  var seqStream = through()
  
  var since = 0
  if (opts.since) since = opts.since + 1 // everything after, not including
  var startKey = this._key(this.keys.seq, lexint.pack(since, 'hex'))
  var endKey = this._key(this.keys.seq, this.sep)
  var rangeOpts = { 
    start: startKey,
    end: endKey,
    limit: opts.limit
  }
  
  var sequences = this.db.createReadStream(rangeOpts)

  sequences.on('data', function (seqRow) {
    var change = decodeSeq(seqRow.value)
    var entry = { 
      id: change._id,
      seq: change._seq,
      rev: change._rev
    }
    if (change._deleted) entry.deleted = true
    if (opts.include_data) {
      // even if it was deleted we do a get to ensure correct ordering by relying on the mutex
      var getOpts = { rev: entry.rev }
      if (entry.id === 'meta') getOpts.valueEncoding = 'json'
      self.get(entry.id, getOpts, function (e, value) {
        if (!entry.deleted) entry.data = value
        seqStream.queue(entry)
      })
    } else {
      seqStream.queue(entry)
    }
  })
  sequences.on('end', function () {
    // hack: get something from the mutex to ensure we're after any data gets
    self.mutex.get('foo', function () {
      seqStream.queue(null)
    })
  })
  return seqStream
}

Database.prototype.pull = function (url, opts, cb) {
  var self = this
  if (!cb && typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (typeof opts.style === 'undefined') opts.style = "newline"
  if (typeof opts.include_data === 'undefined') opts.include_data = true

  this.getSeq(function(err, seq) {
    if (err) seq = 0
    opts.since = seq
    _run()
  })

  function _run () {
    var s = sleep.client(url, opts)
    var count = 0
    var pending = 0
    var ended = false
    s.on('data', function (entry) {
      pending++
      var opts = {}
      if (entry.id === 'meta') opts.valueEncoding = 'json'
      opts.overwrite = true
      self.put(entry.data, opts, function (e) {
        if (e) return cb(e) // probably need something smarter here
        count++
        pending--
        if (ended && pending === 0) done()
      })
    })
    s.on('end', done)
    s.on('error', done)
    
    function done(err) {
      ended = true
      if (pending > 0) return
      if (err) return cb(err)
      cb(null, 'Pulled ' + count + ' new rows')
    }
  }

}

Database.prototype.compact = function (cb) {
  var self = this

  var rangeOpts = { 
    start: this._key(this.keys.data, this.sep),
    end: this._key(this.keys.data, ''),
    reverse: true
  }

  var sequences = self.db.createReadStream(rangeOpts)
  var id = null
  var seqs = []
  var deletes = []
  sequences.on('data', function (row) {
    var _id = row.value._id
    var seq = row.value._seq
    var deleted = row.value._deleted
    if (id !== _id) {
      id = _id
    } else {
      deletes.push(self._key(self.keys.seq, lexint.pack(seq, 'hex')))
      deletes.push(row.key)
    }
  })
  sequences.on('end', function () {
    deletes.forEach(function (entry) {
      self.mutex.del(entry, noop)
    })
    if (deletes.length === 0) return cb(null)
    else self.mutex.afterWrite(cb)
  })
}
