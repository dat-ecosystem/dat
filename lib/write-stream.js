var path = require('path')
var crypto = require('crypto')

var bops = require('bops')
var through = require('through2')
var split = require('binary-split')
var binaryCSV = require('binary-csv')
var byteStream = require('byte-stream')
var multibuffer = require('multibuffer')
var combiner = require('stream-combiner')
var mbstream = require('multibuffer-stream')
var headStream = require('head-stream')
var csvBuffEncoder = require('csv-multibuffer-stream')
var jsonBuffStream = require('json-multibuffer-stream')
var docUtils = require(path.join(__dirname, 'document'))
var debug = require('debug')('dat.writeStream')

var whiteSpace = bops.from(' ') // used to store empty rows in leveldb

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
  
  options.batchTime = options.batchTime || 3000

  if (Object.keys(options).indexOf('overwrite') === -1) {
    // if db is empty then use overwrite mode (faster)
    if (dat.storage.seq === 0) options.overwrite = true
  }
  
  this.setPrimaryKeys(function(err) {
    if (err) console.error('error setting primary keys', err)
    self.bufferStream.resume()
  })
  
  return self.createWriteStream()
}

WriteStream.prototype.createWriteStream = function() {
  var self = this
  var options = this.options
  var pipeChain
  
  if (options.csv || options.f == 'csv') { // raw csv
    pipeChain = this.csvParsers()
  } else if (options.json || options.f == 'json') { // raw ndjson
    pipeChain = this.jsonParsers()
  } else if (options.objects || options.f == 'objects') { // stream of JS Objects (not JSON)
    pipeChain = this.jsonParsers({objects: true})
  } else { // if no specific format is specified then assume .buff
    pipeChain = this.buffParsers()
  }
  
  // buffers until primary keys are set
  // TODO is this even needed now that we've converted to streams2?
  this.bufferStream = through.obj(function(ch, enc, next) {
    this.push(ch)
    next()
  })
  this.bufferStream.pause()
  pipeChain.unshift(this.bufferStream)
  
  this.batchStream = byteStream({ limit: this.dat.dbOptions.writeBufferSize, time: options.batchTime })
  this.writeStream = through.obj(this.onWrite.bind(this), this.onEnd.bind(this))
  
  pipeChain = pipeChain.concat([this.batchStream, this.writeStream])
  
  this.combined = combiner.apply(combiner, pipeChain)
  return this.combined
}

WriteStream.prototype.csvParsers = function() {
  var self = this
  var options = this.options
  
  var csvParser = binaryCSV(options)
  var leadingBuffers

  // grab first row of csv and store columns
  function onFirstCSV(buf, next) {
    var csvColumns = csvParser.line(buf)
    for (var i = 0; i < csvColumns.length; i++) csvColumns[i] = csvParser.cell(csvColumns[i])
    csvColumns = csvColumns.map(function(i) { return i.toString() })
    if (self.primary) self.setPrimaryIndex(csvColumns)
    var newColumns = self.meta.getNewColumns(csvColumns, { strict: true })
    if (newColumns.error) {
      next(newColumns)
    }
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        setImmediate(next)
      })
    } else {
      setImmediate(next)
    }
  }

  if (typeof options.headerRow === 'undefined') options.headerRow = true
  
  var parsers = [
    csvParser
  ]
  
  if (options.headerRow) parsers.push(headStream(onFirstCSV)) // skip first line of csv
  
  var csvEncoder = csvBuffEncoder(this.onRow, options)
  parsers.push(csvEncoder)
  
  return parsers
}

WriteStream.prototype.jsonParsers = function(parserOpts) {
  if (!parserOpts) parserOpts = {}
  var self = this
  var options = this.options
  var store = this.store
  
  var jsonEncoder = jsonBuffStream(self.meta.json.columns, onJsonRow)

  function onJsonRow(obj, cb) {
    var keys = Object.keys(obj)
    var newColumns = store.meta.getNewColumns(keys)
    if (newColumns.error) {
      jsonEncoder.emit('error', newColumns)
      return
    }
    if (self.onRow) self.onRow(obj)
    if (newColumns.length) {
      jsonEncoder.headers = jsonEncoder.headers.concat(newColumns)
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        cb()
      })
    } else {
      cb()
    }
  }
  
  function onFirstJSON(obj, next) {
    if (obj.length) obj = JSON.parse(obj)
    var newColumns = self.meta.getNewColumns(Object.keys(obj))
    if (newColumns.error) console.error(newColumns)
    
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, function(err) {
        if (err) console.error('error updating columns', err)
        if (self.primary) self.setPrimaryIndex()
        jsonEncoder.headers = self.meta.json.columns
        setImmediate(next)
      })
    } else {
      setImmediate(next)
    }
  }

  var hs = headStream(onFirstJSON, {includeHead: true})
  
  var parsers = [
    hs,
    jsonEncoder
  ]
  
  if (!parserOpts.objects) parsers.unshift(split())
  
  return parsers
}

WriteStream.prototype.buffParsers = function() {
  var self = this
  var options = this.options
  
  var parsers = [
    mbstream.unpackStream()
  ]

  if (this.primary) {
    var primaryExtractor = through(function(buff, enc, next) {
      self.onRow(buff)
      primaryExtractor.push(buff)
      next()
    })
    parsers.push(primaryExtractor)
  }

  return parsers
}

WriteStream.prototype.setPrimaryKeys = function(cb) {
  var self = this
  this.primaryKeys = []
  var store = this.store
  var options = this.options
  this.primary = options.primary || options.p || '_id'

  if (this.primary) {
    var currentColumns = self.meta.json.columns.length ? self.meta.json.columns : this.columns
    if (currentColumns) this.setPrimaryIndex(currentColumns)
    this.onRow = function (row, cb) {
      var primaryKey = self.getPrimaryKey(row)
      self.primaryKeys.push({ key: primaryKey, rev: row._rev })
      if (cb) cb()
    }
  }

  if (this.columns) {
    var newColumns = self.meta.getNewColumns(this.columns)
    if (newColumns.error) console.error(newColumns)
    if (newColumns.length > 0) {
      self.meta.addColumns(newColumns, cb)
      return
    }
  }
  
  setImmediate(cb)
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
    if (prim === '_id' && !pkey) primaryKey.push(docUtils.uuid())
    else primaryKey.push(pkey)
  }
  if (primaryKey.length === 1) primaryKey = primaryKey[0]
  return primaryKey
}

WriteStream.prototype.primaryKeyAt = function(i) {
  var id = ''
  var sep = this.options.separator || ''
  var pkey = this.primaryKeys[i]
  var keys = pkey.key
  if (Array.isArray(keys)) {
    for (var i = 0; i < keys.length; i++) {
      var part = keys[i]
      if (!part) continue
      if (id) id += sep
      if (bops.is(part)) id += bops.to(part)
      else id += part.toString()
    }
  } else {
    if (bops.is(part)) id = bops.to(keys)
    else id = keys.toString()
  }
  if (this.options.hash) {
    id = crypto.createHash('md5').update(id).digest("hex")
  }
  return { _id: id, _rev: pkey.rev }
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

WriteStream.prototype.onWrite = function (rows, enc, done) {
  this.writeBatch(rows, done)
}

WriteStream.prototype.onEnd = function (done) {
  this.ended = true
  if (!this.writing) this.writeStream.push(null)
  done()
}

WriteStream.prototype.writeBatch = function (rows, cb) {
  var len = rows.length
  var pending = len
  var meta
  var self = this
  debug('writeBatch', rows.length)
  if (pending > 0) self.writing = true

  function batchDone() {
    debug('writeBatch finished', len)
    self.writing = false
    cb()
    if (self.ended) self.writeStream.push(null)
  }

  function rowDone(err, updated) {
    if (err) return self.writeStream.emit('error', err)
    self.writeStream.push({success: true, row: updated})
    pending--
    if (pending === 0) batchDone()
  }

  for (var i = 0; i < len; i++) {
    meta = null
    row = rows[i]

    // TODO: test for this
    if (row.length === 0) row = whiteSpace

    if (this.primary) {
      meta = this.primaryKeyAt(0)
      this.primaryKeys.shift()
    }

    // TODO: overwrite works (again)
    this.dat.put(row, {meta: meta}, rowDone)
  }
}

function bufferAt(mb, idx) {
  var data = [null, mb]
  for (var i = 0; i < idx + 1; i++) data = multibuffer.readPartial(data[1])
  return data[0]
}
