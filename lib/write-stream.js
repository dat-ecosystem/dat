var path = require('path')
var ldjson = require('ldjson-stream')
var csv = require('csv-parser')
var byteStream = require('byte-stream')
var through = require('through2')
var byteStream = require('byte-stream')
var headStream = require('head-stream')
var combiner = require('stream-combiner')
var mbstream = require('multibuffer-stream')
var debug = require('debug')('write-stream')
var docUtils = require('./document.js')

var OBJ_STREAM_OPTS = {highWaterMark: 16}

module.exports = function writeStream(dat, opts) {
  if (!opts) opts = {}
  
  var parser = parseStream(dat, opts)

  var pipeline = []
  if (opts.columns) pipeline.push(headStream(mergeColumns, {includeHead: true}))
  if (parser) pipeline = pipeline.concat(parser)

  pipeline.push(
    updateSchema(dat, opts),
    primaryKeyStream(dat, opts),
    byteStream({ limit: dat.dbOptions.writeBufferSize, time: opts.batchTime || 3000 }),
    through.obj(OBJ_STREAM_OPTS, writeBatch)
  )

  var processor = combiner.apply(combiner, pipeline)

  // progress data
  processor.documents = 0
  processor.bytes = 0
  processor.conflicts = 0

  return processor

  function mergeColumns(doc, cb) {
    dat.schema.merge(dat.schema.normalize([].concat(opts.columns)), cb)
  }

  function writeBatch(structs, enc, cb) {
    var len = structs.length
    var pending = len
    var struct
    var self = this

    debug('writeBatch', structs.length)

    function batchDone() {
      debug('writeBatch finished', len)
      cb()
    }

    function rowDone(err, updated) {
      if (err) {
        if (opts.results) self.push(err)
        if (err.conflict) {
          debug('conflict', err.key)
          processor.emit('conflict', err)
          processor.conflicts++
          processor.emit('update')
        } else {
          self.emit('error', err)
        }
      }
      if (opts.results && !err) self.push(updated)
      pending--
      if (pending === 0) batchDone()
    }

    for (var i = 0; i < len; i++) {
      struct = structs[i]
      var putOpts = {force: opts.force, skipSchemaCheck: true }
      putOpts.version = struct.version
      processor.bytes += struct.length
      processor.documents++
      processor.emit('update')
      dat.put(struct.key, struct.value, putOpts, rowDone)
    }
  }
}

function updateSchema(dat, opts) {
  return opts.f === 'csv' || opts.csv ? headStream(strict, {includeHead: true}) : through.obj(OBJ_STREAM_OPTS, nonStrict)

  function strict(doc, cb) {
    dat.schema.merge(dat.schema.normalize(doc.headers), {strict: true}, cb)
  }

  function nonStrict(doc, enc, cb) {
    dat.schema.mergeFromObject(doc, function(err) {
      if (err) return cb(err)
      cb(null, doc)
    })
  }
}

function parseStream(dat, opts) {
  if (opts.csv || opts.f === 'csv') return csv(csvOptions(opts))
  if (opts.json || opts.f === 'json') return ldjson()
  if (opts.protobuf || opts.f === 'protobuf') return [mbstream.unpackStream(), through.obj(OBJ_STREAM_OPTS, decodeWrite)]
  
  return null
  
  function decodeWrite(buff, enc, cb) {
    cb(null, dat.schema.decode(buff))
  }
}

function csvOptions(opts) {
  return {
    headers: opts.headerRow === false && opts.columns,
    separator: opts.separator
  }
}

function primaryKeyStream(dat, opts) {
  return through.obj(OBJ_STREAM_OPTS, function(row, enc, cb) {
    dat.beforePut(row, function(err, row) {
      if (err) return cb(err)
      cb(null, new KeyStruct(row.version, docUtils.extractPrimaryKey(row, opts), dat.schema.encode(row)))
    })
  })
}

// for mad v8 speed
function KeyStruct(version, key, data) {
  this.version = version
  this.key = key
  this.value = data
  this.length = data.length
}
