var through = require('through')

module.exports = head

function head (onHead, opts) {
  if (!opts) opts = {}
  var rest = false
  return through(function (chunk) {
    if (rest) return this.queue(chunk)
    if (onHead) {
      rest = true
      if (opts.includeHead) this.queue(chunk)
      return onHead(chunk)
    }
  })
}
