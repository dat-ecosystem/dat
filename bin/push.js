var log = require('../lib/progress-log')
var EOL = require('os').EOL
var through = require('through2')

module.exports = function(dat, opts, cb) {
  var remote = opts._[1]
  var push = dat.push(remote, opts, cb)

  if (opts.results) return push.pipe(resultPrinter())
  if (!opts.quiet) log(push, 'Pushed', 'Push to remote has completed.')
}

function resultPrinter() {
  var results = through.obj(onResultWrite)
  function onResultWrite (obj, enc, next) {
    process.stdout.write(JSON.stringify(obj) + EOL)
    next()
  }
  return results
}
