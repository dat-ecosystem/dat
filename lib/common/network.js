var xtend = Object.assign

module.exports = trackNetwork

function trackNetwork (state, bus) {
  if (state.dat) return track()
  bus.once('dat', track)

  function track () {
    var network = state.dat.joinNetwork(state.opts, function () {
      bus.emit('network:callback')
    })
    state.network = xtend(network, state.network)
    bus.emit('dat:network')

    network.on('connection', function (peer) {
      bus.emit('render')
      peer.on('close', function () {
        bus.emit('render')
      })
    })

    if (state.stats) return trackSpeed()
    bus.once('dat:stats', trackSpeed)

    function trackSpeed () {
      setInterval(function () {
        bus.emit('render')
      }, state.opts.logspeed)
    }
  }
}
