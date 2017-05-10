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

    if (state.opts.peers) trackPeers()
    if (state.stats) return trackSpeed()
    bus.once('dat:stats', trackSpeed)

    function trackSpeed () {
      setInterval(function () {
        bus.emit('render')
      }, state.opts.logspeed)
    }

    function trackPeers () {
      state.peers = state.peers || {}
      network.on('connection', function (conn, info) {
        var id = info.id.toString('hex')
        var peerSpeed = speed()

        state.peers[id] = info
        state.peers[id].speed = peerSpeed()
        state.peers[id].getProgress = function () {

          // TODO: how to get right peer from archive.content?
          // var remote = conn.feeds[1].remoteLength
          // // state.dat.archive.content.peers[0].feed.id.toString('hex')
          // if (!remote) return
          // return remote / dat.archive.content.length
        }

        conn.feeds.map(function (feed) {
          feed.stream.on('data', function (data) {
            state.peers[id].speed = peerSpeed(data.length)
            bus.emit('render')
          })
          feed.stream.on('error', function (err) {
            state.peers[id].error = err
          })
        })
        bus.emit('render')

        conn.on('close', function () {
          state.peers[id].speed = 0
          state.peers[id].closed = true
          bus.emit('render')
        })
      })
    }
  }
}
