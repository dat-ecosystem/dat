const bytes = require('bytes').parse
const speed = require('speedometer')
const throttle = require('throttle')
const pump = require('pump')
const debug = require('debug')('dat')
const xtend = Object.assign

module.exports = trackNetwork

function trackNetwork (state, bus) {
  if (state.dat) return track()
  bus.once('dat', track)

  function track () {
    let opts = state.opts
    if (state.opts.up || state.opts.down) {
      opts = xtend({}, opts, {
        connect: (local, remote) => {
          const streams = [local, remote, local]
          if (state.opts.up) streams.splice(1, 0, throttle(bytes(state.opts.up)))
          if (state.opts.down) streams.splice(-1, 0, throttle(bytes(state.opts.down)))
          pump(streams)
        }
      })
    }
    const network = state.dat.joinNetwork(opts, () => {
      bus.emit('network:callback')
    })

    network.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        if (opts.port) {
          bus.emit('exit:warn', `Specified port (${opts.port}) in use. Please use another port.`)
        } else {
          debug(err.message + ' trying random port')
        }
      } else {
        debug('network error:', err.message)
        // TODO return bus.emit('exit:error', err)
      }
    })
    state.network = xtend(network, state.network)
    bus.emit('dat:network')

    network.on('connection', (conn, info) => {
      bus.emit('render')
      conn.on('close', () => {
        bus.emit('render')
      })
    })

    if (state.opts.sources) trackSources()
    if (state.stats) return trackSpeed()
    bus.once('dat:stats', trackSpeed)

    function trackSpeed () {
      setInterval(() => {
        bus.emit('render')
      }, state.opts.logspeed)
    }

    function trackSources () {
      state.sources = state.sources || {}
      network.on('connection', (conn, info) => {
        const id = info.id.toString('hex')
        const peerSpeed = speed()

        state.sources[id] = info
        state.sources[id].speed = peerSpeed()
        state.sources[id].getProgress =  () => {

          // TODO: how to get right peer from archive.content?
          // const remote = conn.feeds[1].remoteLength
          // // state.dat.archive.content.sources[0].feed.id.toString('hex')
          // if (!remote) return
          // return remote / dat.archive.content.length
        }

        conn.feeds.map(feed => {
          feed.stream.on('data', (data) => {
            state.sources[id].speed = peerSpeed(data.length)
            bus.emit('render')
          })
          feed.stream.on('error', (err) => {
            state.sources[id].error = err
          })
        })
        bus.emit('render')

        conn.on('close', () => {
          state.sources[id].speed = 0
          state.sources[id].closed = true
          bus.emit('render')
        })
      })
    }
  }
}
