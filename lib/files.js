var through = require('through2')
var pumpify = require('pumpify')
var formatData = require('format-data')

module.exports = function (db, args) {
  var stream = db.createKeyStream(args)
  var formatter
  if (args.json) {
    formatter = formatData({
      format: 'json',
      style: 'object',
      key: 'files',
      suffix: '}\n'
    })
  } else {
    formatter = through.obj(function (obj, enc, next) {
      next(null, obj + '\n')
    })
  }

  return pumpify(stream, formatter)
}
