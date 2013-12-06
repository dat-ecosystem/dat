var path = require('path')
var crypto = require('crypto')

var bops = require('bops')
var through = require('through')
var split = require('binary-split')
var binaryCSV = require('binary-csv')
var byteStream = require('byte-stream')
var multibuffer = require('multibuffer')
var combiner = require('stream-combiner')
var mbstream = require('multibuffer-stream')
var headStream = require('head-stream')

var csvBuffEncoder = require(path.join(__dirname, 'csv-buff-encoder'))
var jsonBuffEncoder = require(path.join(__dirname, 'json-buff-encoder'))

module.exports = WriteStream

function WriteStream(dat, options) {
  if (!(this instanceof WriteStream)) return new WriteStream(dat, options)

  var self = this
  
  if (typeof options === 'undefined') options = {}
  if (options.argv) options = options.argv
  
  // grab columns from options
  this.columns = options.c || options.columns
  if (this.columns && !(this.columns instanceof Array)) this.columns = [this.columns]
  
  this.options = options
  this.dat = dat
  this.meta = dat.meta
  this.store = dat.storage
  this.ended = false
  this.writing = false

  if (Object.keys(options).indexOf('overwrite') === -1) {
    // if db is empty then use overwrite mode (faster)
    if (dat.storage.seq === 0) options.overwrite = true
  }
  
  this.setPrimaryKeys()
  
  return this.createWriteStream()
}

WriteStream.prototype.createWriteStream = function() {
  var options = this.options
  var pipeChain
  
  if (options.csv || options.f == 'csv') { // raw csv
    pipeChain = this.csvParsers()
  } else if (options.json || options.f == 'json') { // raw ndjson
    pipeChain = this.jsonParsers()
  } else if (options.objects || options.f == 'objects') { // stream of JS Objects (not JSON)
    pipeChain = this.objectParsers()
  } else { // if no specific format is specified then assume .buff
    pipeChain = this.buffParsers()
  }
  
  this.batchStream = byteStream(this.dat.dbOptions.writeBufferSize)
  this.writeStream = through(this.onWrite.bind(this), this.onEnd.bind(this))

  pipeChain = pipeChain.concat([this.batchStream, this.writeStream])
  
  return combiner.apply(combiner, pipeChain)
}

WriteStream.prototype.csvParsers = function() {
  var self = this
  var options = this.options
  
  var delim = options.d || options.delim
  var csvParser = binaryCSV(delim)

  // grab first row of csv and store columns
  function onFirstCSV(buf, next) {
    var csvColumns = csvParser.line(buf)
    for (var i = 0; i < csvColumns.length; i++) csvColumns[i] = csvParser.cell(csvColumns[i])
    csvColumns = csvColumns.map(function(i) { return i.toString() })
    if (self.primary) self.setPrimaryIndex(csvColumns)
    var newColumns = self.meta.getNewColumns(csvColumns)
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        if (self.primary) self.setPrimaryIndex()
        next()
      })
    } else {
      next()
    }
  }

  if (typeof options.headerRow === 'undefined') options.headerRow = true
  
  var parsers = [
    csvParser
  ]
  
  if (options.headerRow) parsers.push(headStream(onFirstCSV)) // skip first line of csv
  
  parsers.push(csvBuffEncoder(this.onRow))
  
  return parsers
}

WriteStream.prototype.jsonParsers = function() {
  var self = this
  var options = this.options
  var store = this.store
  
  var newlineParser = split()
  var jsonEncoder = jsonBuffEncoder(store, this.onRow)

  function onFirstJSON(obj, next) {
    var newColumns = self.meta.getNewColumns(Object.keys(JSON.parse(obj)))
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        if (self.primary) self.setPrimaryIndex()
        next()
      })
    } else {
      next()
    }
  }
  
  var parsers = [
    newlineParser,
    headStream(onFirstJSON, {includeHead: true}),
    jsonEncoder
  ]
  
  return parsers
}

WriteStream.prototype.objectParsers = function() {
  var self = this
  var options = this.options
  var store = this.store
  
  var jsonEncoder = jsonBuffEncoder(store, this.onRow)

  function onFirstObject(obj, next) {
    var newColumns = self.meta.getNewColumns(Object.keys(obj))
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function onColumnUpdate(err) {
        if (err) console.error('error updating columns', err)
        if (self.primary) self.setPrimaryIndex()
        next()
      })
    } else {
      next()
    }
  }

  var parsers = [
    headStream(onFirstObject, {includeHead: true}),
    jsonEncoder
  ]
  
  return parsers
}

WriteStream.prototype.buffParsers = function() {
  var options = this.options
  
  var parsers = [
    mbstream.unpackStream()
  ]

  if (this.primary) {
    var primaryExtractor = through(this.onRow)
    parsers.push(primaryExtractor)
  }

  return parsers
}

WriteStream.prototype.setPrimaryKeys = function() {
  var self = this
  this.primaryKeys = []
  var store = this.store
  var options = this.options
  
  if (!options.overwrite) this.primary = '_id'
  if (options.primary) this.primary = options.primary

  if (this.primary) {
    var currentColumns = self.meta.json.columns.length ? self.meta.json.columns : this.columns
    if (currentColumns) this.setPrimaryIndex(currentColumns)
    this.onRow = function (row) {
      var primaryKey = self.getPrimaryKey(row)
      self.primaryKeys.push(primaryKey)
      if (this.queue) this.queue(row)
    }
  }

  if (this.columns) {
    var newColumns = self.meta.getNewColumns(this.columns)
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
      })
    }
  }  
}

WriteStream.prototype.getPrimaryKey = function(row) {
  var primaryKey = []
  var idx = this.primaryIndex
  if (!(Array.isArray(idx))) idx = [idx]
  var primary = this.primary
  if (!(Array.isArray(primary))) primary = [primary]
  for (var i = 0; i < idx.length; i++) {
    var pidx = idx[i]
    var prim = primary[i]
    var pkey
    if (prim === '_id' || pidx > -1) {
      if (Array.isArray(row)) pkey = row[pidx]
      else if (bops.is(row)) pkey = bufferAt(row, pidx)
      else pkey = row[prim]
    }
    if (prim === '_id' && !pkey) primaryKey.push(this.store.uuid())
    else primaryKey.push(pkey)
  }
  if (primaryKey.length === 1) primaryKey = primaryKey[0]
  return primaryKey
}

WriteStream.prototype.primaryKeyAt = function(i) {
  var pkey = ''
  var sep = this.options.separator || ''
  var next = this.primaryKeys[i]
  if (Array.isArray(next)) {
    for (var i = 0; i < next.length; i++) {
      var part = next[i]
      if (pkey) pkey += sep
      if (bops.is(part)) pkey += bops.to(part)
      else pkey += part.toString()
    }
  } else {
    if (bops.is(part)) pkey = bops.to(next)
    else pkey = next.toString()
  }
  if (this.options.hash) {
    pkey = crypto.createHash('md5').update(pkey).digest("hex")
  }
  return pkey
}

WriteStream.prototype.setPrimaryIndex = function(columns) {
  if (!columns) columns = this.meta.json.columns
  var primary = this.primary
  var primaryIndex
  if (Array.isArray(primary)) {
    primaryIndex = []
    for (var i = 0; i < primary.length; i++) {
      primaryIndex[i] = columns.indexOf(primary[i])
    }
  } else {
    primaryIndex = columns.indexOf(primary)
  }
  this.primaryIndex = primaryIndex
}

WriteStream.prototype.onWrite = function (rows) {
  var self = this
  var options = this.options
  
  if (options.overwrite) {
    self.writeBatch(rows)
  } else {
    self.checkRows(rows, function(errs, updatedRows) {
      if (errs) return console.error('fatal write errors', errs)
      self.writeBatch(updatedRows)
    })
  }
}

WriteStream.prototype.onEnd = function () {
  this.ended = true
  if (!this.writing) this.writeStream.queue(null)
}

WriteStream.prototype.writeBatch = function (rows) {
  var self = this
  var options = this.options
  var store = this.store
  var len = rows.length
  var pending = len
  if (pending > 0) self.writing = true
  var batch = store.db.batch()
  
  for (var i = 0; i < len; i++) {
    var row = rows[i]
    var doc = {}
    if (row._rev) {
      doc._rev = row._rev
      row = row.buffer
    }
    if (this.primary) {
      doc._id = this.primaryKeyAt(0)
      this.primaryKeys.shift()
    }
    var meta = store.updateRevision(doc, row)
    if (!meta) {
      rows[i] = {success: true, row: doc, existed: true}
      pending--
      if (pending === 0) commit()
      continue
    }
    var seq = store.seq = store.seq + 1
    var keys = store.rowKeys(meta._id, meta._rev, seq)
    batch.put(keys.seq, JSON.stringify([seq, meta._id, meta._rev]))
    batch.put(keys.row, row)
    rows[i] = {success: true, row: meta, data: row}
    pending--
    if (pending === 0) commit()
  }

  function commit() {
    if (batch.ops.length === 0) return next()
    
    batch.write(function(err) {
      if (err) console.error('batch write err', err)
      next()
    })
    
    function next() {
      self.writing = false
      for (var i = 0; i < len; i++) self.writeStream.queue(rows[i])
      self.batchStream.next()
      if (self.ended) self.writeStream.queue(null)        
    }
  }
}

WriteStream.prototype.checkRows = function (rows, cb) {
  var len = rows.length
  var pending = len
  var results = []
  var errors = []
  var store = this.store

  for (var i = 0; i < len; i++) {
    var key = this.primaryKeyAt(i)
    store.get(key, onRow)
  }
  
  function onRow(err, row) {
    results.push([err, row])
    pending--
    if (pending === 0) finish()
  }
  
  function finish() {
    for (var i = 0; i < results.length; i++) {
      var err = results[i][0]
      var row = results[i][1]
      var result = {}
      if (err && err.message !== 'range not found') {
        result.key = key
        result.error = err.message
        errors.push(result)
      }
      if (row) {
        result._rev = row._rev
        result.buffer = rows[i]
        rows[i] = result
      }
    }
    cb(errors.length > 0 ? errors : null, rows)
  }
}

function bufferAt(mb, idx) {
  var data = [null, mb]
  for (var i = 0; i < idx + 1; i++) data = multibuffer.readPartial(data[1])
  return data[0]
}