var log = require('single-line-log').stderr
var prettyBytes = require('pretty-bytes')

module.exports = function (stream, options) {
  var interval = setInterval(printProgress, 200)
  interval.unref()
  printProgress()
  stream.on('finish', endProgress)
  stream.on('end', endProgress)

  function endProgress () {
    printProgress()
    clearInterval(interval)
  }

  function printProgress () {
    if (options.bytes) {
      log(options.verb + ' (' + prettyBytes(stream.progress.bytes) + ').\n')
    } else {
      log(
        options.verb +
        ' [+' + stream.progress.puts + ', -' + stream.progress.deletes + ']' +
        (stream.progress.files ? ' and ' + stream.progress.files + ' file(s)' : '') +
        '.\n'
      )
    }
  }
}
