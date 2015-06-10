var uuid = require('cuid')
var pumpify = require('pumpify')
var through = require('through2')
var debug = require('debug')('lib/import')
var parseInputStream = require('../lib/util/parse-input-stream.js')

module.exports = function (db, opts) {
  if (!opts.dataset) throw new Error('Error: Must specify dataset (-d)')

  var transform = through.obj(function (obj, enc, next) {
    debug('heres my obj!', obj)
    var key = obj[opts.key] || obj.key || uuid()
    next(null, {type: 'put', key: key, value: obj})
  })

  var writeStream = db.createWriteStream({
    message: opts.message,
    dataset: opts.dataset,
    transaction: true
  })

  return pumpify(parseInputStream(opts), transform, writeStream)
}
