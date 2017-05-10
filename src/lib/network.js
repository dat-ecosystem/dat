var speed = require('speedometer')
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

    network.on('connection', function (conn, info) {
      bus.emit('render')
      conn.on('close', function () {
        bus.emit('render')
      })
    })

    if (state.opts.sources) trackSources()
    if (state.stats) return trackSpeed()
    bus.once('dat:stats', trackSpeed)

    function trackSpeed () {
      setInterval(function () {
        bus.emit('render')
      }, state.opts.logspeed)
    }

    function trackSources () {
      state.sources = state.sources || {}
      network.on('connection', function (conn, info) {
        var id = info.id.toString('hex')
        var peerSpeed = speed()

        state.sources[id] = info
        state.sources[id].speed = peerSpeed()
        state.sources[id].getProgress = function () {

          // TODO: how to get right peer from archive.content?
          // var remote = conn.feeds[1].remoteLength
          // // state.dat.archive.content.sources[0].feed.id.toString('hex')
          // if (!remote) return
          // return remote / dat.archive.content.length
        }

        conn.feeds.map(function (feed) {
          feed.stream.on('data', function (data) {
            state.sources[id].speed = peerSpeed(data.length)
            bus.emit('render')
          })
          feed.stream.on('error', function (err) {
            state.sources[id].error = err
          })
        })
        bus.emit('render')

        conn.on('close', function () {
          state.sources[id].speed = 0
          state.sources[id].closed = true
          bus.emit('render')
        })
      })
    }
  }
}
