var EOL = require('os').EOL

module.exports = version

version.usage = ['dat version', 'show dat version'].join(EOL)

function version(dat, opts, cb) {
  console.log('dat version ' + dat.version)
  process.nextTick(cb)
}
