var through = require('through')
var bops = require('bops')

module.exports = log

function log (onEnd) {
  return through(function (obj) {
    if (bops.is(obj)) obj = JSON.parse(obj)
    process.stdout.write(JSON.stringify(obj) + EOL)
    this.queue(chunk)
  }, onEnd)
}
