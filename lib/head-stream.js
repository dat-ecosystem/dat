var through = require('through')

module.exports = head

function head (onHead, opts) {
  if (!opts) opts = {}
  
  var rest = false
  var stream = through(write, end)
  
  return stream
  
  function write(chunk) {
    var self = this
    if (rest) return self.queue(chunk)
    self.pause()
    onHead(chunk, function next() {
      rest = true
      if (opts.includeHead) self.queue(chunk)
      self.resume()
    })
  }
  
  function end() {
    this.resume()
    this.queue(null)
  }
}
