var path = require('path')
var ldjson = require('ldjson-stream')
var csv = require('csv-parser')
var byteStream = require('byte-stream')
var through = require('through2')
var byteStream = require('byte-stream')
var headStream = require('head-stream')
var combiner = require('stream-combiner')
var peek = require('peek-stream')
var mbstream = require('multibuffer-stream')
var debug = require('debug')('write-stream')
var docUtils = require('./document.js')

var OBJ_STREAM_OPTS = {highWaterMark: 16}

module.exports = function writeStream(dat, opts) {
  if (!opts) opts = {}
  
  var parser = parseStream(dat, opts)

  var pipeline = []
  if (opts.columns) pipeline.push(headStream(mergeColumns, {includeHead: true}))

  pipeline = pipeline.concat(parser)
  pipeline.push(
    byteStream({ limit: dat.dbOptions.writeBufferSize, time: opts.batchTime || 3000 }),
    through.obj(OBJ_STREAM_OPTS, writeBatch)
  )

  var processor = combine(pipeline)

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
      processor.bytes += struct.length
      processor.documents++
      processor.emit('update')
      dat.storage.put(struct.key, struct.value, {version:struct.version, force:opts.force}, rowDone)
    }
  }
}

function parseStream(dat, opts) {
  if (opts.csv || opts.f === 'csv') return parseCSV()
  if (opts.json || opts.f === 'json') return parseJSON()
  if (opts.protobuf || opts.f === 'protobuf') return parseProtobuf()
  if (opts.objects || opts.f === 'objects') return parseObjects()

  return peek({strict:true}, function(data, swap) {
    if (!Buffer.isBuffer(data)) return swap(null, combine(parseObjects()))
    if (isJSON(data)) return swap(null, combine(parseJSON()))
    if (isCSV(data)) return swap(null, combine(parseCSV()))
    cb(new Error('Could not auto detect input type'))
  })
  
  function primaryKeyStream() {
    return through.obj(OBJ_STREAM_OPTS, function(row, enc, cb) {
      dat.beforePut(row, function(err, row) {
        if (err) return cb(err)
        cb(null, new KeyStruct(row.version, docUtils.extractPrimaryKey(row, opts), dat.schema.encode(row)))
      })
    })
  }

  function parseCSV() {
    return [
      csv({
        headers: opts.headerRow === false && opts.columns,
        separator: opts.separator
      }),
      headStream(updateSchema, {includeHead: true}),
      primaryKeyStream()
    ]

    function updateSchema(doc, cb) {
      dat.schema.merge(dat.schema.normalize(doc.headers), {strict: true}, cb)
    }
  }

  function parseJSON() {
    return [
      ldjson()
    ].concat(parseObjects())
  }

  function parseObjects() {
    return [
      through.obj(OBJ_STREAM_OPTS, updateSchema),
      primaryKeyStream()
    ]

    function updateSchema(doc, enc, cb) {
      dat.schema.mergeFromObject(doc, function(err) {
        if (err) return cb(err)
        cb(null, doc)
      })
    }
  }

  function parseProtobuf() {
    return [
      mbstream.unpackStream(),
      through.obj(OBJ_STREAM_OPTS, decodeWrite),
    ].concat(parseObjects())

    function decodeWrite(buff, enc, cb) {
      cb(null, dat.schema.decode(buff))
    }
  }

}

function isJSON(data) {
  try {
    JSON.parse(data)
    return true
  } catch (err) {
    return false
  }
}

function isCSV(data) {
  return data.toString().indexOf(',') > 0
}

function combine(streams) {
  return combiner.apply(combiner, streams)
}

// for mad v8 speed
function KeyStruct(version, key, data) {
  this.version = version
  this.key = key
  this.value = data
  this.length = data.length
}
