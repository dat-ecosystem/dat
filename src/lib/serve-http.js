
module.exports = runHttp

function runHttp (state, bus) {
  if (state.dat) return serve()
  bus.once('dat', serve)

  function serve () {
    var port = (typeof state.opts.http === 'boolean') ? 8080 : state.opts.http
    var server = state.dat.serveHttp({ port: port })

    server.on('listening', function () {
      state.http = { port: port, listening: true }
      bus.emit('render')
    })
  }
}
