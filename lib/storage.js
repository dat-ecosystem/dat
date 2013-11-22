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

module.exports = Database

function Database (db, meta, cb) {
  if (!(this instanceof Database)) return new Database(db, meta, cb)
  var self = this
  
  this.db = db
  this.meta = meta
  self.timestamp = monot()
  this.mutex = mutex(this.db)
  this.sep = '\xff'
  this.keys = {
    seq:  's',
    data: 'd',
    rev:  'r'
  }
  
  if (!this.meta.json) return cb(new Error('parent was not ready'))
  if (!this.meta.json.columns) this.meta.json.columns = []
  
  self.getSeq(function(err, seq) {
    if (err) {
      self.seq = 0
      return cb()
    }
    self.seq = seq
    cb()
  })
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

Database.prototype.currentData = function() {
  var stream = through()
  var self = this
  
  var beginningKey = ''
  proceed(beginningKey)
  
  return stream
  
  function proceed(fromKey) {
    getNext(fromKey, function(err, row) {
      if (err) return stream.end()
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
      value = jsonbuff.decode(self.meta.json.columns, value)
      var doc = extend(decoded, value)
      delete doc._seq
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
    nextHash = hash(doc, rowBuffer, this.meta.json.columns)
    if (prevHash === nextHash) return false // doc didnt change
  }
  if (!nextHash) nextHash = hash(doc, rowBuffer, this.meta.json.columns)
  var rev = prev + 1 + '-' + nextHash
  return extend({}, doc, {_rev: rev, _id: id})
}

Database.prototype.rowKeys = function(id, rev, seq) {
  var revParts = rev.split('-')
  var revNum = +revParts[0]
  var seqKey = ''
  if (seq) seqKey = this._key(this.keys.seq, pack(seq))
  var keys = {
    row: this._key(this.keys.data, id + this._key(this.keys.rev, pack(revNum) + '-' + revParts[1]) + seqKey)
  }
  if (seq) keys.seq = seqKey
  return keys
}

Database.prototype.get = function (key, opts, cb) {
  var self = this
  
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  
  opts.valueEncoding = 'binary'
  
  var revKey = ''
  if (opts.rev) {
    var revParts = opts.rev.split('-')
    revKey = self._key(this.keys.rev, pack(+revParts[0]) + '-' + revParts[1])
  }
  var rowKey = self._key(this.keys.data, key + revKey)

  extend(opts, {
    start: rowKey,
    end: rowKey + this.sep + this.sep
  })

  this.mutex.peekLast(opts, function (e, k, v) {
    if (e) return cb(e)
    v = jsonbuff.decode(self.meta.json.columns, v)
    var doc = extend(decodeKey(k), v)
    delete doc._seq
    cb(null, doc)
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
  var updated
  
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
  
  var columns = Object.keys(doc)
  if (opts.columns) columns = columns.concat(opts.columns)
  var newColumns = this.meta.getNewColumns(columns)
  if (newColumns.length === 0) return store()
  
  self.meta.addColumns(newColumns, function(err) {
    if (err) return cb(err)
    store()
  })  
  
  function store() {
    if (!opts.overwrite) updated = self.updateRevision(doc, buffer)
    else updated = doc

    if (!updated) return setImmediate(function() {
      cb(null, doc)
    })
  
    var seq = self.seq = self.seq + 1
  
    var keys = self.rowKeys(updated._id, updated._rev, seq)
  
    opts.valueEncoding = 'binary'
    
    if (!buffer) buffer = jsonbuff.encode(updated, self.meta.json.columns)

    self.mutex.put(keys.seq, [seq, updated._id, updated._rev], noop)
    self.mutex.put(keys.row, buffer, opts, function (e) {
      if (e) return cb(e)
      cb(null, updated)
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
  this.mutex.put(this._key(this.keys.seq, pack(seq)), {_deleted: true, _id: key, _seq: seq}, opts, noop)
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
  
  seqStream.on('end', function() {
    // clean up liveStream
    sequences.destroy()
  })
  
  var since = 0
  if (opts.since) since = opts.since + 1 // everything after, not including
  var startKey = this._key(this.keys.seq, pack(since))
  var endKey = this._key(this.keys.seq, this.sep)
  var rangeOpts = { 
    start: startKey,
    end: endKey,
    limit: opts.limit
  }
  
  var sequences
  if (opts.live) sequences = this.db.liveStream(rangeOpts)
  else sequences = this.db.createReadStream(rangeOpts)
  
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

Database.prototype.createPullStream = function (url, opts) {
  var self = this
    
  if (!opts) opts = {}
  if (typeof opts.style === 'undefined') opts.style = "newline"
  if (typeof opts.include_data === 'undefined') opts.include_data = true

  var stream = through(write)
  
  this.getSeq(function(err, seq) {
    if (err) seq = 0
    opts.since = seq
    stream.client = sleep.client(url, opts)
    stream.client.pipe(stream)
  })
  
  return stream
  
  function write(entry) {
    this.queue(entry.data)
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
      deletes.push(self._key(self.keys.seq, pack(seq)))
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

function noop() {}

function pack(val) {
  if (typeof val === 'undefined') throw new Error('cannot pack undefined value')
  return lexint.pack(val, 'hex')
}

function unpack(val) {
  if (typeof val === 'undefined') throw new Error('cannot unpack undefined value')
  return lexint.unpack(val, 'hex')
}

// example: ÿdÿffe33ee5ÿrÿfc0148ÿsÿ01
function decodeKey(key) {
  var parts = key.split('ÿ')
  var revs = parts[4].split('-')
  return {
    '_id': parts[2],
    '_rev': unpack(revs[0]) + '-' + revs[1],
    '_seq': unpack(parts[6])
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
    rowBuffer = jsonbuff.encode(doc, columns)
  }
  var hash = crypto.createHash('md5').update(rowBuffer).digest("hex")
  if (rev) {
    doc._rev = rev
  }
  return hash
}