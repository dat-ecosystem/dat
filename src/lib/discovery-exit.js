var output = require('neat-log/output')

module.exports = discoveryExit

function discoveryExit (state, bus) {
  bus.once('network:callback', checkExit)

  function checkExit () {
    if (state.dat.network.connected || !state.opts.exit) return
    if (state.dat.network.connecting) return setTimeout(checkExit, 500) // wait to see if any connections resolve
    var msg = output(`
      Dat could not find any connections for that link.
      There may not be any sources online.

      Run 'dat doctor' if you keep having trouble.
    `)
    bus.emit('exit:warn', msg)
  }
}
