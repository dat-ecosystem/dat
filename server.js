var dat = require('.')()
var emitStream = require('emit-stream')
var JSONStream = require('JSONStream')

module.exports = function (server, stream) {
  return {
    join: function (link, dir) {
      var progress = dat.join(link, dir)
      var stream = emitStream(progress).pipe(JSONStream.stringify())
      progress.on('end', function () {
        stream.end()
      })
      return stream
    },
    leave: function (id) {
      dat.leave(id)
    },
    close: function (cb) {
      dat.close(function () {
        server.close()
        cb()
        stream.destroy()
      })
    }
  }
}
