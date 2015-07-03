var log = require('single-line-log').stderr
var prettyBytes = require('pretty-bytes')

module.exports = function (stream, options) {
  setInterval(printProgress, 200).unref()
  printProgress()
  stream.on('finish', printProgress)
  stream.on('end', printProgress)

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
