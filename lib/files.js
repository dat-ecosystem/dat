var abort = require('./util/abort.js')
var fs = require('fs')

module.exports = function (args, cb) {
  fs.readdir(args.path, cb)
}
