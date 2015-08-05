var uuid = require('cuid')
var pumpify = require('pumpify')
var through = require('through2')
var debug = require('debug')('lib/import')
var parseInputStream = require('../lib/util/parse-input-stream.js')

var COMPOUND_KEY_SEPARATOR = '+'

module.exports = function (db, opts) {
  if (!opts) opts = {}
  if (!opts.dataset) throw new Error('Error: Must specify dataset (-d)')
  if (opts.dataset === 'files') throw new Error('Cannot import into the \'files\' dataset')

  var transform = through.obj(function (obj, enc, next) {
    debug('heres my obj!', obj)

    var key
    if (opts.keys) {
      key = opts.keys.sort().map(function (key) {
        return obj[key] || ''
      }).join(COMPOUND_KEY_SEPARATOR)
    } else {
      key = obj[opts.key] || obj.key
    }

    if (!key || key === COMPOUND_KEY_SEPARATOR) key = uuid()
    var doc = {type: 'put', key: key, value: obj}
    next(null, doc)
  })

  var writeStream = db.createWriteStream({
    message: opts.message,
    dataset: opts.dataset,
    batchSize: opts.batch,
    deduplicate: opts.deduplicate,
    transaction: true
  })

  var stream = pumpify(parseInputStream(opts), transform, writeStream)
  stream.progress = writeStream.progress
  return stream
}
