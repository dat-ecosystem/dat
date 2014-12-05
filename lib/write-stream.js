var path = require('path')
var ndjson = require('ndjson')
var csv = require('csv-parser')
var byteStream = require('byte-stream')
var through = require('through2')
var byteStream = require('byte-stream')
var headStream = require('head-stream')
var pumpify = require('pumpify')
var peek = require('peek-stream')
var mbstream = require('multibuffer-stream')
var debug = require('debug')('write-stream')
var JSONStream = require('JSONStream')
var docUtils = require('./document.js')
var detectJSON = require('detect-json-style')
var detectCSV = require('detect-csv')

module.exports = function writeStream(dat, opts) {
  if (!opts) opts = {}
  
  var parser = parseStream()

  var pipeline = [headStream(onFirst, {includeHead: true})]

  pipeline = pipeline.concat(parser)
  pipeline.push(
    byteStream({ limit: opts.bufferSize || 1024 * 1024 * 16, time: opts.batchTime || 3000 }),
    through.obj(writeBatch)
  )

  var processor = combine(pipeline)

  // progress data
  processor.changes = 0
  processor.bytes = 0

  if (!opts.results) processor.resume()

  return processor
  
  
  function parseStream() {
    if (opts.csv || opts.f === 'csv') return parseCSV(opts.separator)
    if (opts.tsv || opts.f === 'tsv') return parseCSV('\t')
    if (opts.json || opts.f === 'json') return parseJSON(opts.jsonpath)
    if (opts.protobuf || opts.f === 'protobuf') return parseProtobuf()
    if (opts.objects || opts.f === 'objects') return parseObjects()

    var detectMax = opts.detectMax || 8000
  
    return peek({newline: false, maxBuffer: detectMax}, function(data, swap) {
      if (!Buffer.isBuffer(data)) return swap(null, combine(parseObjects()))
      var jsonStyle = detectJSON(data)
      if (jsonStyle)  {
        jsonStyle.format = 'json'
        processor.emit('detect', jsonStyle)
        return swap(null, combine(parseJSON(jsonStyle.selector)))
      }
      var isCSV = detectCSV(data)
      if (isCSV) {
        processor.emit('detect', {
          format: 'csv',
          separator: isCSV.delimiter
        })
        return swap(null, combine(parseCSV(isCSV.delimiter)))
      }
      swap(new Error('Could not auto detect input type. Please specify --json or --csv format.'))
    })
    
    function primaryKeyStream() {
      return through.obj(function(row, enc, cb) {
        dat.beforePut(row, function(err, row) {
          if (err) return cb(err)
          var version = row.version
          if(typeof version !== 'number') {
            version = parseInt(version)
            if(isNaN(version)) delete version
          }
          cb(null, new KeyStruct(version, docUtils.extractPrimaryKey(row, opts), dat.schema.encode(row)))
        })
      })
    }

    function parseCSV(separator) {
      return [
        csv({
          headers: opts.headerRow === false && opts.columns,
          separator: separator
        }),
        headStream(updateSchema, {includeHead: true}),
        primaryKeyStream()
      ]

      function updateSchema(doc, cb) {
        dat.schema.merge(doc.headers, {strict: true}, cb)
      }
    }

    function parseJSON(selector) {
      return [
        JSONStream.parse(selector)
      ].concat(parseObjects())
    }

    function parseObjects() {
      return [
        through.obj(updateSchema),
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
        through.obj(decodeWrite),
      ].concat(parseObjects())

      function decodeWrite(buff, enc, cb) {
        cb(null, dat.schema.decode(buff))
      }
    }

  }


  function mergeColumns(doc, cb) {
    dat.schema.merge([].concat(opts.columns), cb)
  }

  function onFirst(doc, cb) {
    dat.exists(function(exists) {
      if (!exists) return processor.destroy(new Error('There is no dat here.'))
      if (opts.columns) return mergeColumns(doc, cb)
      cb()
    })
  }

  function put(key, val, opts, cb) {
    dat.storage.put(key, val, opts, function(err, value, version) {
      cb(err, key, value, version)
    })
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

    function rowDone(err, key, updated, version) {
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
      if (opts.results && !err) self.push(dat.schema.decode(updated, {key:key, version:version}))
      pending--
      if (pending === 0) batchDone()
    }

    if (!len) return cb()

    for (var i = 0; i < len; i++) {
      struct = structs[i]
      processor.bytes += struct.length
      processor.changes++
      processor.emit('update')
      put(struct.key, struct.value, {version:struct.version, force:opts.force}, rowDone)
    }
  }
}

function combine(streams) {
  return pumpify.obj(streams)
}

// for mad v8 speed
function KeyStruct(version, key, data) {
  this.version = version
  this.key = key
  this.value = data
  this.length = data.length
}
