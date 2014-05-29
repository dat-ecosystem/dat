// this file is adapted from mikeal/level-sleep/index.js

var bops = require('bops')
var debug = require('debug')('dat.storage')
var extend = require('extend')
var mutex = require('level-mutex')
var path = require('path')
var sleep = require('sleep-ref')
var through = require('through2')

var schema = require(path.join(__dirname, 'schema'))
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
  

  self.schema = schema(this, function(err) {
    if (err) return cb(err)
    self.getChange(function(err, change) {
      if (err) {
        self.change = 0
        return loadRowCount()
      }
      self.change = change
      loadRowCount()
    })
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
    self.updateLastUpdated()
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
      var row = docUtils.decodeRow(rowKey, val, self)
      if (row._deleted) return cb(new Error('row has been deleted'))
      if (row.error && row.type === 'columnMismatch') {
        // schema may have been updated, try reading JSON and trying again
        self.schema.update(function(err) {
          if (err) return cb(err)
          var row = docUtils.decodeRow(rowKey, val, self)
          if (row.error && row.type === 'columnMismatch') return cb(row)
          return cb(null, row)
        })
      } else {
        cb(null, row)
      }
    })
  }
}

Database.prototype.put = function (key, val, opts, cb) {
  var self = this
  var updated, doc
  var isNew = false
  
  // argument overloading section! TODO abstractify this
  
  if (!opts && !cb) { // put(obj, cb)
    cb = val
    val = key
    key = undefined
  } else if (!cb) {
    // we only support string keys right now
    if (typeof key === 'string') { // put(key, val, cb)
      cb = opts
      opts = {}
    } else { // put(doc, opts, cb)
      cb = opts
      opts = val
      val = key
      key = undefined
    }
  }
  
  if (!opts) opts = {}
  
  if (Buffer.isBuffer(val)) { // assume val is a protobuf
    doc = {id: key}
    if (opts.version) doc.version = opts.version
  } else if (val) {
    // assume val is an Object
    doc = val
    val = undefined
    // key overrides val.id
    if (key) doc.id = key
  } else {
    throw new Error('put() requires a value')
  }
  
  // at this point doc should be an object with id === key (or falsy to get an auto-gen'd key)
  
  debug('args', [key, val, opts, typeof cb])
  
  if (!opts.skipSchemaCheck) {
    if (opts.columns) {
      self.schema.merge(self.schema.normalize(opts.columns), check)
    } else {
      self.schema.mergeFromObject(doc, check)
    }
  } else {
    check()
  }
  
  function check(err) {
    if (err) return cb(err)
    
    // TODO implement primary + hash options from writeStream here (see writeStream.writeBatch)
    if (!doc.id) {
      isNew = true
      return store()
    }
    
    debug('check', doc.id)
    self.get(doc.id, function(err, existing) {
      if (err) {
        isNew = true
        return store()
      }
      // force causes a forced upgrade (ignores version conflicts, makes new revision)
      if (opts.force) {
        doc.version = existing.version
        return store()
      }
      if (!doc.version || doc.version[0] < existing.version[0]) return cb(self.errors.conflict())
      store()
    })
  }
  
  function store() {
    if (isNew && doc.version) {
      updated = doc // use version passed in instead of defaulting to version 1
    } else {
      updated = docUtils.updateVersion(doc, val, self.meta.json.columns)
    }
    
    var change = self.change = self.change + 1
    
    var keys = docUtils.rowKeys(self.keys, self.sep, updated.id, updated.version, change, updated._deleted)
    
    opts.valueEncoding = 'binary'
    
    if (!val) val = self.schema.encode(updated)
    var changeVal = [change, updated.id, updated.version]
    
    if (updated._deleted) {
      changeVal.push(true) // 4th spot in changeVal array is a deleted boolean
    }
    
    var curVal = docUtils.pack(+updated.version)
    // store deleted status in current val as well
    if (updated._deleted) curVal += self.sep + '1'
    
    // levelup won't store empty values
    if (val.length === 0) val = whiteSpace

    // todo handle errors
    self.mutex.put(keys.change, JSON.stringify(changeVal), noop)
    self.mutex.put(keys.row, val, opts, noop)
    self.mutex.put(keys.cur, curVal, function (err) {
      cb(err, updated)
    })
    
    if (isNew) self.pendingRowCount++
    if (updated._deleted) self.pendingRowCount--
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
  if (opts.reverse && opts.reverse === 'true') {
    curOpts.reverse = true
    var tmpStart = curOpts.start
    curOpts.start = curOpts.end
    curOpts.end = tmpStart
  }
  
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
        console.error('readStream GET Error: ', err)
        next()
        return
      }
      var valuesOnly = !opts.keys
      var decoded = docUtils.decodeRow(key, val, self, valuesOnly)
      if (!decoded._deleted) stream.push(decoded)
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
    var decoded = docUtils.decodeRow(row.key, row.value, self)
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

Database.prototype.setMeta = function(key, val, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  if (!opts) opts = {}

  debug('setMeta', key, val)
  this.mutex.put(this._key(this.keys.meta, key), val, opts, cb || noop)
}

Database.prototype.getMeta = function(key, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = null
  }
  if (!opts) opts = {}

  debug('getMeta', key)
  var self = this
  this.mutex.afterWrite(function () {
    self.mutex.get(self._key(self.keys.meta, key), opts, function(err, val) {
      if (err) return cb(err)
      cb(null, val)
    })
  })
}

Database.prototype.incRowCount = function (diff) {
  this.setRowCount(this.meta.rowCount + diff)
}

Database.prototype.setRowCount = function (val) {
  debug('setRowCount', val)
  this.meta.rowCount = val
  this.setMeta('_rowCount', val, noop)
}

Database.prototype.updateLastUpdated = function () {
  var now = new Date().toISOString()
  debug('updateLastUpdated', now)
  this.meta.lastUpdated = now
  this.setMeta('lastUpdated', now, noop)
}

Database.prototype.getRowCount = function (cb) {
  this.getMeta('_rowCount', function(err, val) {
    if (err) return cb(err)
    cb(null, parseInt(val, 10))
  })
}
