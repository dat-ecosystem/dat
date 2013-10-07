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
var row = require(path.join(__dirname, 'row'))

// TODO benchmark + review various uuid options
function uuid() {
  return Math.random().toString(16).slice(2)
}

function noop() {}

function encodeInt(number) {
  return lexint.pack(number, 'hex')
}

function decodeInt(hex) {
  var bytes = []
  for (var i = 0; i < hex.length; i = i+2) {
    bytes.push(parseInt(hex[i] + hex[i+1], 16))
  }
  return lexint.unpack(bytes)
}

function decodeKey(key) {
  var parts = key.split('ÿ')
  return {
    '_id': parts[2],
    '_rev': parts[4],
    '_seq': parts[6]
  }
}

module.exports = Database

function Database (db, cb) {
  if (!(this instanceof Database)) return new Database(db, cb)
  var self = this
  this.db = db
  this.mutex = mutex(this.db)
  this.seqKey = 's'
  this.dataKey = 'd'
  this.revKey = 'r'
  this.sep = '\xff'
  this.getSeq(function(err, seq) {
    if (err) {
      self.seq = 0
      return cb(false)
    }
    self.seq = seq
    cb(false)
  })
}

util.inherits(Database, events.EventEmitter)

Database.prototype._key = function(sublevel, key) {
  return this.sep + sublevel + this.sep + key
}

Database.prototype.getSeq = function(cb) {
  var opts = { 
    start: this._key(this.seqKey, ''),
    end: this._key(this.seqKey, this.sep)
  }
  this.mutex.peekLast(opts, function (e, key, val) {
    if (e) return cb(e)
    return cb(false, val._seq)
  })
}

Database.prototype.currentData = function() {
  var stream = through()
  var self = this
  proceed('')
  return stream
  
  function proceed(fromKey) {
    getNext(fromKey, function(err, key) {
      if (err) return stream.end()
      self.get(key, function(err, val) {
        if (err) return stream.end()
        stream.queue(val)
        proceed(key)
      })
    })
  }
  
  function getNext(key, cb) {
    var startKey = self._key(self.dataKey, key ? key + self.sep + self.sep : key)
    var endKey = self._key(self.dataKey, self.sep)
    self.mutex.peekFirst({start: startKey, end: endKey}, function (e, key, value) {
      if (e) return cb(new Error('not found.'))
      cb(false, decodeKey(key)._id)
    })
  }
}

Database.prototype.updateRevision = function(doc) {
  var id = doc._id
  if (typeof id !== 'string') id = uuid()
  var prev = row.revision(doc._rev)
  var rev = prev + 1 // + '-' + row.hash(doc)
  var seq = this.seq = this.seq + 1
  return {rev: rev, seq: seq, id: id}
}

Database.prototype.update = function (doc, cb) {
  var self = this
  if (typeof doc._id !== 'string') doc._id = uuid()
  this.get(doc._id, function(err, old) {
    if (err) old = {}
    if (old._rev !== doc._rev) return cb('Error: Supplied _rev out of date. Existing _rev: ' + old._rev + ', supplied _rev: ' + doc._rev + '.')
    doc = self.updateRevision(doc)
    cb(false, doc)
  })
}

Database.prototype.rowKeys = function(id, rev, seq) {
  var seqKey = this._key(this.seqKey, encodeInt(seq))
  return {
    seq: seqKey,
    row: this._key(this.dataKey, id + this._key(this.revKey, encodeInt(rev)) + seqKey)
  }
}

Database.prototype.put = function (rawDoc, cb) {
  var self = this
  var doc = this.updateRevision(rawDoc)
  var keys = self.rowKeys(doc._id, doc._seq)
  self.mutex.put(keys.seq, {_id: doc._id, _seq: doc._seq, _rev: doc._rev}, noop)
  self.mutex.put(keys.row, doc, function (e) {
    if (e) return cb(e)
    cb(null, doc)
  })
}

Database.prototype.del = function (key, cb) {
  this.seq += 1
  var seq = this.seq
  this.mutex.put(this._key(this.seqKey, encodeInt(seq)), {_deleted: true, _id: key, _seq: seq}, noop)
  this.mutex.put(this._key(this.dataKey, key), {_deleted: true, _seq: seq}, function (e) {
    if (e) return cb(e)
    cb(null, seq)
  })
}

Database.prototype.get = function (key, cb) {
  var seqKey = this._key(this.seqKey, '')
  var rowKey = this._key(this.dataKey, key)
  var opts = {
    start: rowKey,
    end: rowKey + this.sep + this.sep
  }
  this.mutex.peekLast(opts, function (e, k, v) {
    if (e) return cb(e)
    cb(null, v)
  })
}

Database.prototype.getSequences = function (opts) {
  opts.since = opts.since || 0
  opts.limit = opts.limit || -1
  var pending = []
  var self = this
  var ee = new events.EventEmitter()
  var since = 0
  if (opts.since) since = opts.since + 1 // everything after, not including
  var startKey = this._key(this.seqKey, encodeInt(since))
  var endKey = this._key(this.seqKey, this.sep)
  var rangeOpts = { 
    start: startKey,
    end: endKey,
    limit: opts.limit
  }

  var sequences = this.db.createReadStream(rangeOpts)

  sequences.on('data', function (change) {
    var key = change.value._id
    var seq = change.value._seq
    var entry = { 
      id: key,
      seq: seq,
      deleted: change.value._deleted
    }
    if (opts.include_data) {
      
      var seqKey = self._key(self.seqKey, encodeInt(seq))
      var rowKey = self._key(self.dataKey, key + seqKey)

      // even if it was deleted we do a get to ensure correct ordering by relying on the mutex
      self.mutex.get(rowKey, function (e, value) {
        if (!entry.deleted) entry.data = value
        ee.emit('entry', entry)
      })
    } else {
      ee.emit('entry', entry)
    }
  })
  sequences.on('end', function () {
    // hack: get something from the mutex to ensure we're after any data gets
    self.mutex.get('foo', function () {
      ee.emit('end')
    })
  })
  return ee
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
    s.on('entry', function (entry) {
      pending++
      self.put(entry.id, entry.data, function (e) {
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
    start: this._key(this.dataKey, this.sep),
    end: this._key(this.dataKey, ''),
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
      deletes.push(self._key(self.seqKey, encodeInt(seq)))
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
