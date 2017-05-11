var http = require('http')
var serve = require('hyperdrive-http')

module.exports = runHttp

function runHttp (state, bus) {
  var port = (typeof state.opts.http === 'boolean') ? 8080 : state.opts.http
  var server = http.createServer(serve(state.dat.archive, {live: true}))
  server.listen(port)
  server.on('listening', function () {
    state.http = { port: port, listening: true }
    bus.emit('render')
  })
}
