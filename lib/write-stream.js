var crypto = require('crypto')
var ldjson = require('ldjson-stream')
var csv = require('csv-parser')
var byteStream = require('byte-stream')
var through = require('through2')
var cuid = require('cuid')
var byteStream = require('byte-stream')
var headStream = require('head-stream')
var combiner = require('stream-combiner')
var mbstream = require('multibuffer-stream')
var debug = require('debug')('write-stream')

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
  processor.parser = parser
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
      if (err) return cb(err)
      if (opts.results) self.push(updated)
      pending--
      if (pending === 0) batchDone()
    }

    for (var i = 0; i < len; i++) {
      struct = structs[i]
      var putOpts = {overwrite: opts.overwrite, skipSchemaCheck: true }
      putOpts.version = struct.version
      dat.put(struct.key, struct.data, putOpts, rowDone)
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
  var primary = [].concat(opts.primary || 'key')
  var format = opts.primaryFormat
  var separator = opts.separator || ''

  return through.obj(OBJ_STREAM_OPTS, function(doc, enc, cb) {
    cb(null, new KeyStruct(doc.version, extractKey(doc), schema.encode(doc)))
  })

  function extractKey(doc) {
    var key = ''

    for (var i = 0; i < primary.length; i++) {
      var pri = primary[i]
      var priKey = doc[pri]

      if (format) priKey = format(priKey)
      if (!priKey && pri === 'key') priKey = cuid()
      if (key) key += separator

      key += priKey
    }

    if (opts.hash) return crypto.createHash('md5').update(key).digest("hex")
    return key
  }
}

// for mad v8 speed
function KeyStruct(version, key, data) {
  this.version = version
  this.key = key
  this.data = data
  this.length = data.length
}