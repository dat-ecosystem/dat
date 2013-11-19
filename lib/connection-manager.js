module.exports = function(server) {
  var sockets = []
  server.on('connection', function (socket) {
    sockets.push(socket)
    // socket.setTimeout(4000)
    socket.on('close', function () {
      sockets.splice(sockets.indexOf(socket), 1)
    })
  })
  
  var obj = {
    sockets: sockets,
    close: close
  }
  
  function close() {
    server.close()
    for (var i = 0; i < sockets.length; i++) {
      sockets[i].destroy()
    }
  }
  
  return obj
}