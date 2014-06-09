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
var docUtils = require(path.join(__dirname, 'document'))

var OBJ_STREAM_OPTS = {highWaterMark: 16}

module.exports = function writeStream(dat, opts) {
  var schema = dat.schema
  var parser = parseStream(opts, schema)

  var pipeline = []
  if (opts.columns) pipeline.push(headStream(mergeColumns, {includeHead: true}))
  if (parser) pipeline = pipeline.concat(parser)

  pipeline.push(
    updateSchema(opts, schema),
    primaryKeyStream(opts, schema),
    byteStream({ limit: dat.dbOptions.writeBufferSize, time: opts.batchTime || 3000 }),
    through.obj(OBJ_STREAM_OPTS, writeBatch)
  )

  var processor = combiner.apply(combiner, pipeline)

  // progress data
  processor.documents = 0
  processor.bytes = 0

  return processor

  function mergeColumns(doc, cb) {
    schema.merge(schema.normalize([].concat(opts.columns)), cb)
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
          processor.emit('conflict', err)
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
      var putOpts = {overwrite: opts.overwrite, skipSchemaCheck: true }
      putOpts.version = struct.version
      processor.bytes += struct.length
      processor.documents++
      processor.emit('update')
      dat.put(struct.key, struct.value, putOpts, rowDone)
    }
  }
}

function updateSchema(opts, schema) {
  return opts.f === 'csv' || opts.csv ? headStream(strict, {includeHead: true}) : through.obj(OBJ_STREAM_OPTS, nonStrict)

  function strict(doc, cb) {
    schema.merge(schema.normalize(doc.headers), {strict: true}, cb)
  }

  function nonStrict(doc, enc, cb) {
    schema.mergeFromObject(doc, function(err) {
      if (err) return cb(err)
      cb(null, doc)
    })
  }
}

function parseStream(opts, schema) {
  if (opts.csv || opts.f === 'csv') return csv(csvOptions(opts))
  if (opts.json || opts.f === 'json') return ldjson()
  if (opts.objects || opts.f === 'objects') return null

  return [mbstream.unpackStream(), through.obj(OBJ_STREAM_OPTS, decodeWrite)]

  function decodeWrite(buff, enc, cb) {
    cb(null, schema.decode(buff))
  }
}

function csvOptions(opts) {
  return {
    headers: opts.headerRow === false && opts.columns,
    separator: opts.separator
  }
}

function primaryKeyStream(opts, schema) {
  return through.obj(OBJ_STREAM_OPTS, function(row, enc, cb) {
    cb(null, new KeyStruct(row.version, docUtils.extractPrimaryKey(row, opts), schema.encode(row)))
  })
}

// for mad v8 speed
function KeyStruct(version, key, data) {
  this.version = version
  this.key = key
  this.value = data
  this.length = data.length
}
