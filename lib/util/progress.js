var log = require('single-line-log').stderr

module.exports = function (stream, options) {
  setInterval(printProgress, 200).unref()
  printProgress()
  stream.on('finish', printProgress)
  stream.on('end', printProgress)

  function printProgress () {
    if (options.replicate) {
      log(
        options.verb +
        ' [+' + stream.progress.puts + ', -' + stream.progress.deletes + ']' +
        (stream.progress.files ? ' and ' + stream.progress.files + ' file(s)' : '') +
        '.\n'
      )
    } else {
      log(options.verb + ' ' + stream.progress.keys + ' ' + options.subject + '.\n')
    }
  }
}
