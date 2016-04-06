var dat = require('.')()

module.exports = function (server, stream) {
  return {
    join: function (id, cb) {
      var archive = dat.drive.get(id, '.')
      dat.join(id)
      var stream = archive.createEntryStream()
      stream.resume()
      stream.on('data', function (data) {
        console.log('got item', data)
        archive.download(data, function (err) {
          if (err) throw err
          console.log('downloaded')
        })
      })
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
