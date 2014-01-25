// this file is adapted from mikeal/level-sleep/index.js

var mutex = require('level-mutex')
var sleep = require('sleep-ref')
var through = require('through')
var path = require('path')
var extend = require('extend')
var bops = require('bops')
var jsonBuffStream = require('json-multibuffer-stream')

var docUtils = require(path.join(__dirname, 'document'))

function noop() {}

module.exports = Database

function Database (db, meta, cb) {
  if (!(this instanceof Database)) return new Database(db, meta, cb)
  var self = this
  
  this.db = db
  this.meta = meta
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

Database.prototype._key = function(sublevel, key) {
  return docUtils.key(this.sep, sublevel, key)
}

Database.prototype.getSeq = function(cb) {
  var opts = { 
    start: this._key(this.keys.seq, ''),
    end: this._key(this.keys.seq, this.sep)
  }
  this.mutex.peekLast(opts, function (e, key, val) {
    if (e) return cb(e)
    return cb(false, docUtils.decodeSeq(val)._seq)
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
      docUtils.decodeRow(key, value, self.meta, cb)
    })
  }
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
    revKey = self._key(this.keys.rev, docUtils.pack(+revParts[0]) + '-' + revParts[1])
  }
  var rowKey = self._key(this.keys.data, key + revKey)

  extend(opts, {
    start: rowKey,
    end: rowKey + this.sep + this.sep
  })

  this.mutex.peekLast(opts, function (e, k, v) {
    if (e) return cb(e)
    docUtils.decodeRow(k, v, self.meta, cb)
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
    if (!opts.overwrite) updated = docUtils.updateRevision(doc, buffer, self.meta.json.columns)
    else updated = doc

    if (!updated) return setImmediate(function() {
      cb(null, doc)
    })
  
    var seq = self.seq = self.seq + 1
    var schema = self.meta.currentSchema()
  
    var keys = docUtils.rowKeys(self.keys, self.sep, updated._id, updated._rev, seq, schema.version)
  
    opts.valueEncoding = 'binary'
    
    if (!buffer) buffer = jsonBuffStream.encode(updated, schema.columns)
    
    self.mutex.put(keys.seq, JSON.stringify([seq, updated._id, updated._rev]), noop)
    self.mutex.put(keys.row, buffer, opts, function (e) {
      if (e) return cb(e)
      cb(null, updated)
    })
  }
}

Database.prototype.delete = function (key, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  this.seq += 1
  var seq = this.seq
  this.mutex.put(this._key(this.keys.seq, docUtils.pack(seq)), {_deleted: true, _id: key, _seq: seq}, opts, noop)
  this.mutex.put(this._key(this.keys.data, key), {_deleted: true, _seq: seq}, opts, function (e) {
    if (e) return cb(e)
    cb(null, seq)
  })
}

Database.prototype.createReadStream = function(opts) {
  var self = this
  
  opts = opts || {}
  opts.valueEncoding = 'binary'
  
  var startKey = this._key(this.keys.data, opts.start || '')
  var endKey = this._key(this.keys.data, (opts.end || '') + this.sep)
  
  var rangeOpts = extend({}, opts, { 
    start: startKey,
    end: endKey
  })

  var readStream
  
  if (opts.live) readStream = this.db.createLiveStream(rangeOpts)
  else readStream = this.db.createReadStream(rangeOpts)
  
  var decoderStream = through(write, end, { end: false })
  decoderStream.pending = 0
  
  readStream.pipe(decoderStream)
  
  return decoderStream
  
  function write (data) {
    decoderStream.pending++
    docUtils.decodeRow(data.key, data.value, self.meta, function(err, doc) {
      decoderStream.pending--
      if (err) return decoderStream.emit('error', err)
      decoderStream.queue(doc)
      if (decoderStream.ended && decoderStream.pending === 0) {
        decoderStream.queue(null)
      }
    })
  }
  
  function end(buf) {
    this.ended = true
    if (this.pending === 0) {
      if (buf) this.queue(buff)
      this.queue(null)
    }
  }
}

Database.prototype.createChangesStream = function (opts) {
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
  var startKey = this._key(this.keys.seq, docUtils.pack(since))
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
    var change = docUtils.decodeSeq(seqRow.value)
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
      deletes.push(self._key(self.keys.seq, docUtils.pack(seq)))
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
