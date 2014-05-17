var path = require('path')
var crypto = require('crypto')

var jsonProtobuf = require('json-protobuf-stream')
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
  if (this.columns) this.columns = dat.schema.normalize(this.columns)
  
  this.options = options
  this.dat = dat
  this.meta = dat.meta
  this.schema = dat.schema
  this.store = dat.storage
  this.ended = false
  this.writing = false
  
  options.batchTime = options.batchTime || 3000

  if (Object.keys(options).indexOf('overwrite') === -1) {
    // if db is empty then use overwrite mode (faster)
    if (dat.storage.change === 0) options.overwrite = true
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
  var csvColumns = this.columns;

  function updateSchema(sch, next) {
    self.schema.merge(sch, {strict:true}, next)
  }

  // grab first row of csv and store columns
  function onFirstCSV(buf, next) {
    csvColumns = csvParser.line(buf)
    for (var i = 0; i < csvColumns.length; i++) csvColumns[i] = csvParser.cell(csvColumns[i]).toString()
    csvColumns = self.schema.normalize(csvColumns)
    if (self.primary) self.setPrimaryIndex(csvColumns)
    updateSchema(csvColumns, next);
  }

  function onFirstCSVNoHeaders(row, next) {
    updateSchema(self.columns, next);
  }

  if (typeof options.headerRow === 'undefined') options.headerRow = true

  var parsers = [
    csvParser
  ]

  if (options.headerRow) parsers.push(headStream(onFirstCSV)) // skip first line of csv
  else parsers.push(headStream(onFirstCSVNoHeaders, {includeHead:true}))

  parsers.push(through.obj(function(row, enc, cb) {
    var doc = {};

    var line = csvParser.line(row);
    for (var i = 0; i < csvColumns.length; i++) {
      doc[csvColumns[i].name] = csvParser.cell(line[i]).toString();
    }

    if (self.onRow) self.onRow(doc);
    cb(null, self.schema.encode(doc));
  }))

  return parsers
}

WriteStream.prototype.jsonParsers = function(parserOpts) {
  if (!parserOpts) parserOpts = {}
  var self = this
  var options = this.options
  var store = this.store
  var first = true;

  var encoder = through.obj(function(row, enc, cb) {
    try {
      if (row.length) row = JSON.parse(row)
    } catch (err) {
      return cb(err)
    }

    if (first) {
      first = false;
      self.schema.mergeFromObject(row, function(err) {
        if (err) return cb(err)
        if (self.primary) self.setPrimaryIndex()
        if (self.onRow) self.onRow(row)
        cb(null, self.schema.encode(row))
      })
      return;
    }

    self.schema.mergeFromObject(row, function(err) {
      if (err) return cb(err)
      if (self.onRow) self.onRow(row)
      cb(null, self.schema.encode(row))
    })
  })

  return parserOpts.objects ? [encoder] : [split(), encoder];
}

WriteStream.prototype.buffParsers = function() {
  var self = this
  var options = this.options

  var parsers = [
    mbstream.unpackStream()
  ]

  if (this.primary) {
    var primaryExtractor = through(function(buff, enc, next) {
      self.onRow(self.schema.decode(buff));
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
  this.primary = options.primary || options.p || 'id'

  if (options.primaryFormat) this.primaryFormat = options.primaryFormat
  
  if (this.primary) {
    var currentColumns = self.meta.json.columns.length ? self.meta.json.columns : this.columns
    if (currentColumns) this.setPrimaryIndex(currentColumns)
    this.onRow = function (row, cb) {
      var primaryKey = self.getPrimaryKey(row)
      self.primaryKeys.push({ key: primaryKey, version: row.version })
      if (cb) cb()
    }
  }
  
  if (this.columns) {
    self.schema.merge(this.columns, cb)
    return
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
    if (prim === 'id' || pidx > -1) {
      if (Array.isArray(row)) pkey = row[pidx]
      else if (bops.is(row)) pkey = bufferAt(row, pidx)
      else pkey = row[prim]
    }
    if (prim === 'id' && !pkey) pkey = docUtils.uuid()
    if (this.primaryFormat) pkey = this.primaryFormat(pkey)
    primaryKey.push(pkey)
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
  return { id: id, version: pkey.version }
}

WriteStream.prototype.setPrimaryIndex = function(columns) {
  if (!columns) columns = this.schema.toJSON()

  columns = columns.map(function(col) {
    return col.name || col
  })

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

    if (this.primary) {
      meta = this.primaryKeyAt(0)
      this.primaryKeys.shift()
    }

    // TODO: instead of hacky meta option, primary key building should happen in storage
    this.dat.put(row, { meta: meta, overwrite: this.options.overwrite, skipSchemaCheck: true }, rowDone)
  }
}

function bufferAt(mb, idx) {
  var data = [null, mb]
  for (var i = 0; i < idx + 1; i++) data = multibuffer.readPartial(data[1])
  return data[0]
}
