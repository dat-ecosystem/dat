var dat = require('.')()
var emitStream = require('emit-stream')
var JSONStream = require('JSONStream')

module.exports = function (server, stream) {
  return {
    join: function (link, dir, cb) {
      return emitStream(dat.join(link, dir, cb)).pipe(JSONStream.stringify())
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
