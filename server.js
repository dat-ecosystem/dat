var dat = require('.')()

module.exports = function (server, stream) {
  return {
    join: function (id, path) {
      return dat.join(id, path)
    },
    leave: function (id) {
      return dat.leave(id)
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
