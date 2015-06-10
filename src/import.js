var uuid = require('cuid')
var pumpify = require('pumpify')
var through = require('through2')
var debug = require('debug')('src/import')
var parseInputStream = require('../lib/parse-input-stream.js')

module.exports = function createImportStream (opts) {
  if (!opts.dataset) throw new Error('Error: Must specify dataset (-d)')
  var self = this

  var transform = through.obj(function (obj, enc, next) {
    debug('heres my obj!', obj)
    var key = obj[opts.key] || obj.key || uuid()
    next(null, {type: 'put', key: key, value: obj})
  })

  var writeStream = self.db.createWriteStream({
    message: opts.message,
    dataset: opts.dataset,
    transaction: true
  })

  return pumpify(parseInputStream(opts), transform, writeStream)
}