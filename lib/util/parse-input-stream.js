var pumpify = require('pumpify')
var peek = require('peek-stream')
var detectJSON = require('detect-json-style')
var detectCSV = require('detect-csv')
var JSONStream = require('JSONStream')
var csv = require('csv-parser')
var through = require('through2')
var debug = require('debug')('parse-input-stream')

module.exports = parseStream

function parseStream (opts) {
  if (!opts) opts = {}
  if (opts.f === 'csv') return parseCSV(opts.separator)
  if (opts.f === 'tsv') return parseCSV('\t')
  if (opts.f === 'json') return parseJSON(opts.jsonpath)
  if (opts.f === 'objects') return parseObjects()

  var detectMax = opts.detectMax || 8000

  return peek({newline: false, maxBuffer: detectMax}, function (data, swap) {
    if (!Buffer.isBuffer(data)) return swap(null, parseObjects())
    var jsonStyle = detectJSON(data)
    if (jsonStyle) {
      jsonStyle.format = 'json'
      return swap(null, parseJSON(jsonStyle.selector))
    }
    var isCSV = detectCSV(data)
    if (isCSV) {
      return swap(null, parseCSV(isCSV.delimiter))
    }
    swap(new Error('Could not auto detect input type. Please specify --format=csv,json'))
  })

  function parseCSV (separator) {
    debug('parsing csv')
    return combine([
      csv({
        headers: opts.headerRow === false && opts.columns,
        separator: separator
      })
    ])
  }

  function parseJSON (selector) {
    debug('parsing json')
    return combine([
      JSONStream.parse(selector),
      parseObjects()
    ])
  }

  function parseObjects () {
    debug('parsing objects')
    return through.obj() // empty through obj stream
  }
}

function combine (streams) {
  if (streams.length === 1) return streams[0]
  return pumpify.obj(streams)
}
