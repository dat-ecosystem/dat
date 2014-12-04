var path = require('path')
var rimraf = require('rimraf')
var EOL = require('os').EOL

module.exports = clean

clean.usage = ['dat clean', 'remove .dat folder'].join(EOL)

function clean(dat, opts, cb) {
  rimraf('.dat', cb)
}