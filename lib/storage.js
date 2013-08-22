// this file is adapted from mikeal/level-sleep/index.js
// this is intended to be a strawman implementation
// everything here is subject to change

var util = require('util')
var events = require('events')
var mutex = require('level-mutex')
var sleep = require('sleep-ref')

function noop() {}

module.exports = Database

function Database (db, cb) {
  if (!(this instanceof Database)) return new Database(db, cb)
  var self = this
  this.db = db
  this.mutex = mutex(this.db)
  this.seqKey = 's'
  this.dataKey = 'd'
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

Database.prototype.put = function (key, value, cb) {
  var self = this
  this.seq += 1
  var seq = this.seq
  if (typeof seq !== 'number') throw new Error('Invalid sequence.')
  value._seq = seq
  value._id = key
  var seqKey = this._key(this.seqKey, seq)
  var rowKey = this._key(this.dataKey, key + seqKey)
  this.mutex.put(seqKey, {_id: key, _seq: seq}, noop)
  this.mutex.put(rowKey, value, function (e) {
    if (e) return cb(e)
    cb(null, seq)
    self.emit('entry', {seq: seq, id: key, data: value})
  })
}

Database.prototype.del = function (key, cb) {
  this.seq += 1
  var seq = this.seq
  this.mutex.put(this._key(this.seqKey, seq), {_deleted: true, _id: key, _seq: seq}, noop)
  this.mutex.put(this._key(this.dataKey, key), {_deleted: true, _seq: seq}, function (e) {
    if (e) return cb(e)
    cb(null, seq)
    self.emit('entry', {seq: seq, id: key, data: value, deleted: true})
  })
}

Database.prototype.get = function (key, cb) {
  var seqKey = this._key(this.seqKey, '')
  var rowKey = this._key(this.dataKey, key + seqKey)
  
  var opts = {
    start: rowKey,
    end: rowKey + this.sep
  }
  
  this.mutex.peekLast(opts, function (e, key, value) {
    if (e) return cb(new Error('not found.'))
    cb(null, value)
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
  var startKey = this._key(this.seqKey, since)
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
      
      var seqKey = self._key(self.seqKey, seq)
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
      deletes.push(self._key(self.seqKey, seq))
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
