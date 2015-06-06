var log = require('single-line-log').stdout
var prettyBytes = require('pretty-bytes')
var through = require('through2')

module.exports = function (prefix) {
  var read = 0
  var changes = 0

  return through.obj(function (data, enc, next) {
    read += data.length
    changes += 1
    var msg = ''
    msg += prefix + ' ' + changes + ' changes (' + prettyBytes(read) + ')\n'
    log(msg)
    next(null, data)
  })
}