var dat = require('.')()

module.exports = function (server, stream) {
  return {
    join: function (id, cb) {
      dat.join(id)
      console.log('join', id)
      cb()
    },
    leave: function (id, cb) {
      dat.leave(id)
      cb()
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
