var path = require('path')
var rimraf = require('rimraf')

module.exports = function(dat, opts, cb) {
  rimraf("./.dat", cb)
}