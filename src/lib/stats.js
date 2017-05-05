var xtend = Object.assign

module.exports = trackStats

function trackStats (state, bus) {
  if (state.dat) return track()
  bus.once('dat', track)

  function track () {
    var stats = state.dat.trackStats(state.opts)
    state.stats = xtend(stats, state.stats)
    stats.on('update', function () {
      bus.emit('stats:update')
      bus.emit('render')
    })
    bus.emit('stats')
  }
}
