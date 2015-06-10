var pumpify = require('pumpify')
var through = require('through2')
var formatData = require('format-data')
var debug = require('debug')('src/export')

module.exports = function createExportStream (opts) {
  var parseOutput = through.obj(function (data, enc, next) {
    debug('exporting through data', data)
    if (data.content === 'row') {
      var row = data.value
      row.key = data.key
      return next(null, row)
    }
  })

  return pumpify(this.db.createReadStream(opts), parseOutput, formatData(opts.format))
}