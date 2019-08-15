
module.exports = runHttp

function runHttp (state, bus) {
  if (state.dat) return serve()
  bus.once('dat', serve)

  function serve () {
    const port = (typeof state.opts.http === 'boolean') ? 8080 : state.opts.http
    const server = state.dat.serveHttp({ port: port })

    server.on('listening', () => {
      state.http = { port: port, listening: true }
      bus.emit('render')
    })
  }
}
