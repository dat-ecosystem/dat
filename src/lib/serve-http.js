var http = require('http')
var serve = require('hyperdrive-http')

module.exports = runHttp

function runHttp (state, bus) {
  var port = (typeof state.opts.http === 'boolean') ? 8080 : state.opts.http
  var footer = 'Served via Dat.'
  // TODO: opts.exposeHeaders = true? Also exposes key which we mat not always want.
  var server = http.createServer(serve(state.dat.archive, {live: true, footer: footer}))
  server.listen(port)
  server.on('listening', function () {
    state.http = { port: port, listening: true }
    bus.emit('render')
  })
}
