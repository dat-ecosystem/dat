// this file is adapted from mikeal/level-sleep/index.js

var bops = require('bops')
var debug = require('debug')('dat.storage')
var extend = require('extend')
var jsonBuffStream = require('json-multibuffer-stream')
var mutex = require('level-mutex')
var path = require('path')
var sleep = require('sleep-ref')
var through = require('through2')

var docUtils = require(path.join(__dirname, 'document'))

function noop() {}

var whiteSpace = bops.from(' ') // used to store empty rows in leveldb

module.exports = Database

function Database (db, meta, cb) {
  if (!(this instanceof Database)) return new Database(db, meta, cb)
  var self = this

  this.db = db
  this.meta = meta
  this.mutex = mutex(this.db)
  this.pendingRowCount = 0
  this.sep = '\xff'
  this.keys = {
    change:  's',
    data: 'd',
    version:  'r',
    cur: 'c',
    meta: 'm'
  }
  
  this.errors = {
    conflict: function() {
      var err = new Error('ID conflict. A row with that ID already exists and/or has a newer version.')
      err.conflict = true
      return err
    }
  }
  
  if (!this.meta.json) return cb(new Error('parent was not ready'))
  if (!this.meta.json.columns) this.meta.json.columns = []
  
  self.getChange(function(err, change) {
    if (err) {
      self.change = 0
      return loadRowCount()
    }
    self.change = change
    loadRowCount()
  })
  
  function loadRowCount() {
    self.getRowCount(function(err, count) {
      if (err) return cb() // ignore err
      self.meta.rowCount = count
      cb()
    })
  }

  this.mutex.on('flushed', function () {
    if (self.pendingRowCount === 0) return
    self.incRowCount(self.pendingRowCount)
    self.pendingRowCount = 0
  })
}

Database.prototype._key = function(sublevel, key) {
  return docUtils.key(this.sep, sublevel, key)
}

Database.prototype.getChange = function(cb) {
  var opts = { 
    start: this._key(this.keys.change, ''),
    end: this._key(this.keys.change, this.sep)
  }
  this.mutex.peekLast(opts, function (e, key, val) {
    if (e) return cb(e)
    return cb(false, docUtils.decodeChange(val).change)
  })
}

Database.prototype.get = function (key, opts, cb) {
  var self = this
  
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  
  opts.valueEncoding = 'binary'
  
  if (opts.version) {
    var ver = docUtils.pack(+opts.version)
    getRow(key, ver)
  } else {
    var curKey = self._key(self.keys.cur, key)
    self.mutex.get(curKey, function(err, version) {
      if (err) return cb(err)
      getRow(key, version)
    })
  }
  
  function getRow(key, version) {
    var rowKey = self._key(self.keys.data, key + self.sep + version)
    self.mutex.get(rowKey, opts, function(err, val) {
      if (err) return cb(err)
      var row = docUtils.decodeRow(rowKey, val, self.meta)
      if (row._deleted) return cb(new Error('row has been deleted'))
      if (row.error && row.type === 'columnMismatch') {
        // schema may have been updated, try reading JSON and trying again
        self.meta.read(function(err, json) {
          self.meta.json = json
          var row = docUtils.decodeRow(rowKey, val, self.meta)
          if (row.error && row.type === 'columnMismatch') return cb(row)
          return cb(null, row)
        })
      } else {
        cb(null, row)
      }
    })
  }
}

// .put(obj, buff, opts, cb)
// .put(buff, opts, cb)
// .put(obj, buff, cb)
// .put(obj, opts, cb)
// .put(obj, cb)
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

  opts.meta = opts.meta || {}

  if (!opts.skipSchemaCheck) {
    var columns = Object.keys(doc)
    if (opts.columns) columns = columns.concat(opts.columns)
    var newColumns = this.meta.getNewColumns(columns)
    if (newColumns.error) return cb(newColumns)
    if (newColumns.length === 0) return check()
    self.meta.addColumns(newColumns, function(err) {
      if (err) return cb(err)
      check()
    })
  } else {
    check()
  }
  
  
  function check() {
    // TODO implement primary + hash options from writeStream here (see writeStream.writeBatch)
    if (opts.meta.id) doc.id = opts.meta.id
    if (opts.overwrite || !doc.id) return store()
    
    debug('check', doc.id)
    self.get(doc.id, function(err, existing) {
      if (err) return store()
      // TODO user friendliness for reviseConflicts option (and better name...)
      if (opts.meta.version || opts.reviseConflicts) {
        doc = existing
        return store()
      }
      if (!doc.version || doc.version[0] < existing.version[0]) return cb(self.errors.conflict())
      store()
    })
  }
  
  function store() {
    if (!opts.overwrite || !doc.version) updated = docUtils.updateVersion(doc, buffer, self.meta.json.columns)
    else updated = doc
    
    var change = self.change = self.change + 1
    
    var keys = docUtils.rowKeys(self.keys, self.sep, updated.id, updated.version, change, updated._deleted)
    
    opts.valueEncoding = 'binary'
    
    if (!buffer) buffer = jsonBuffStream.encode(updated, self.meta.json.columns)
    
    var changeVal = [change, updated.id, updated.version]
    
    if (updated._deleted) {
      changeVal.push(true) // 4th spot in changeVal array is a deleted boolean
    }
    
    var curVal = docUtils.pack(+updated.version)
    
    if (buffer.length === 0) buffer = whiteSpace
    
    // todo handle errors
    self.mutex.put(keys.change, JSON.stringify(changeVal), noop)
    self.mutex.put(keys.row, buffer, opts, noop)
    self.mutex.put(keys.cur, curVal, function (err) {
      cb(err, updated)
    })
    
    self.pendingRowCount += updated._deleted ? -1 : 1
  }
}

// TODO should version be necessary for deletes?
Database.prototype.delete = function (key, opts, cb) {
  var self = this
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  
  self.get(key, function(err, row) {
    if (err) return cb(err)
    row._deleted = true
    self.put(row, cb)
  })
}

Database.prototype.createReadStream = function(opts) {
  var self = this
  if (!opts) opts = {}
  if (typeof opts.keys === 'undefined') opts.keys = true
  
  var curOpts = {
    start: self._key(self.keys.cur, ''),
    end: self._key(self.keys.cur, self.sep)
  }
  
  if (opts.start) curOpts.start = self._key(self.keys.cur, opts.start)
  if (opts.end) curOpts.end = self._key(self.keys.cur, opts.end)
  if (opts.limit) curOpts.limit = +opts.limit
  
  var stream = through.obj(write, end)
  
  var dbStream = self.db.createReadStream(curOpts)
  dbStream.pipe(stream)
  
  var pending = 0
  
  function write(row, enc, next) {
    var encKey = row.key.split(self.sep)[2]
    var key = self._key(self.keys.data, encKey + self.sep + row.value)
    pending++
    self.db.get(key, { valueEncoding: 'binary'}, function(err, val) {
      if (err) {
        stream.emit('error', err)
        next()
        return
      }
      var valuesOnly = !opts.keys
      var decoded = docUtils.decodeRow(key, val, self.meta, valuesOnly)
      stream.push(decoded)
      if (--pending === 0 && stream.ended) stream.push(null)
      next()
    })
  }
  
  function end(next) {
    stream.ended = true
    // if no rows were matched
    if (pending === 0) stream.push(null)
    next()
  }

  return stream
}

// gets all versions of a id
Database.prototype.createVersionStream = function (id, opts) {
  var self = this
  if (!opts) opts = {}
  if (typeof opts.valueEncoding === 'undefined') opts.valueEncoding = 'binary'
  
  if (!opts.start) opts.start = self._key(self.keys.data, id)
  if (!opts.end) opts.end = self._key(self.keys.data, id + self.sep + self.sep)
  
  var stream = through.obj(write)
  
  self.db.createReadStream(opts).pipe(stream)
  
  function write(row, enc, next) {
    var decoded = docUtils.decodeRow(row.key, row.value, self.meta)
    stream.push(decoded)
    next()
  }
  
  return stream
}

Database.prototype.createChangesStream = function (opts) {
  var self = this
  if (!opts) opts = {}
  if (opts.tail && !opts.since) {
    var tailNum = parseInt(opts.tail)
    if (!isNaN(tailNum)) opts.since = this.change - tailNum
    else opts.since = this.change
    if (opts.since < 0) opts.since = 0
  }
  opts.since = +opts.since || 0
  opts.limit = +opts.limit || -1
  var pending = []
  
  var since = 0
  if (opts.since) since = opts.since + 1 // everything after, not including
  
  var startKey = this._key(this.keys.change, docUtils.pack(since))
  var endKey = this._key(this.keys.change, this.sep)
  
  var rangeOpts = { 
    start: startKey,
    end: endKey,
    limit: opts.limit
  }
  
  var getStream = through.obj({end: false}, getWrite)
  
  var liveReadStream, normalReadStream
  
  if (opts.live) {
    // if we are an rpc client use the REST /api/changes API of the rpc server
    if (self.db.rpcServer) {
      if (opts.limit < 0) delete opts.limit // todo fix stream-ref
      if (!opts.style) opts.style = 'newline'
      return sleep.client(self.db.rpcServer +  '/api/changes', opts)
    }

    // otherwise we must be the rpc server, so use the liveStream (which doesnt work over RPC)
    liveReadStream = this.db.liveStream(rangeOpts)
    
    getStream.on('end', function() {
      // clean up liveStream
      liveReadStream.destroy()
    })
    
    // note: this should probably become a PR to https://github.com/dominictarr/level-live-stream to
    // add e.g. old=5 support instead of just old=true in the level-live-stream API
    if (tailNum && !isNaN(tailNum)) {
      var adjustedStart = (this.change - tailNum) + 1
      if (adjustedStart < 0) adjustedStart = this.change
      var tailOpts = { 
        start: this._key(this.keys.change, docUtils.pack(adjustedStart)),
        end: this._key(this.keys.change, this.sep),
        limit: opts.limit
      }
      normalReadStream = this.db.createReadStream(tailOpts)
    }
  } else {
    normalReadStream = this.db.createReadStream(rangeOpts)
  }
  
  // see above comment re: level-live-stream for explanation
  if (normalReadStream && liveReadStream) {
    normalReadStream.pipe(getStream, { end: false })
    normalReadStream.on('end', function() {
      liveReadStream.pipe(getStream, { end: false })
      liveReadStream.on('end', function() {
        getStreamEnd()
      })
    })
  } else if (normalReadStream) {
    normalReadStream.pipe(getStream)
    normalReadStream.on('end', function() {
      getStreamEnd()
    })
  } else if (liveReadStream) {
    liveReadStream.pipe(getStream)
    liveReadStream.on('end', function() {
      getStreamEnd()
    })
  }
  
  var pending = 0
  var ended = false
  
  function getWrite(changeRow, end, next) {
    var change = docUtils.decodeChange(changeRow.value)
    var entry = { 
      id: change.id,
      change: change.change,
      version: change.version
    }
    if (change._deleted) entry.deleted = true
    if (opts.data) {
      // even if it was deleted we do a get to ensure correct ordering by relying on the mutex
      var getOpts = { version: entry.version }
      pending++
      self.get(entry.id, getOpts, function (e, value) {
        if (!entry.deleted) entry.data = value
        getStream.push(entry)
        if (--pending === 0 && ended) {
          getStream.end()
        }
        next()
      })
    } else {
      getStream.push(entry)
      next()
    }
  }

  function getStreamEnd() {
    ended = true
    if (pending === 0) getStream.end()
  }
  
  return getStream
}

Database.prototype.createPullStream = function (url, opts) {
  var self = this
    
  if (!opts) opts = {}
  if (typeof opts.style === 'undefined') opts.style = "newline"
  if (typeof opts.data === 'undefined') opts.data = true

  var stream = through.obj(write)
  
  this.getChange(function(err, change) {
    if (err) change = 0
    opts.since = change
    stream.client = sleep.client(url, opts)
    stream.client.on('error', function(err) {
      stream.emit('error', err)
    })
    stream.client.pipe(stream)
  })
  
  return stream
  
  function write(entry, end, next) {
    this.push(entry.data)
    next()
  }
}

Database.prototype.incRowCount = function (diff) {
  this.setRowCount(this.meta.rowCount + diff)
}

Database.prototype.setRowCount = function (val) {
  debug('setRowCount', val)
  this.meta.rowCount = val
  this.mutex.put(this._key(this.keys.meta, '_rowCount'), val, noop)
}

Database.prototype.getRowCount = function (cb) {
  var self = this
  this.mutex.afterWrite(function () {
    self.mutex.get(self._key(self.keys.meta, '_rowCount'), function(err, val) {
      if (err) return cb(err)
      cb(null, parseInt(val, 10))
    })
  })
}
