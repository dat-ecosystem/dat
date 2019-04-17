var debug = require('debug')('dat')
var xtend = Object.assign

module.exports = trackDownload

function trackDownload (state, bus) {
  if (state.hasContent) return track()
  bus.once('archive:content', track)

  function track () {
    var archive = state.dat.archive

    state.download = xtend({
      modified: false,
      nsync: false
    }, {})

    archive.content.on('clear', function () {
      debug('archive clear')
      state.download.modified = true
    })

    archive.content.on('download', function (index, data) {
      state.download.modified = true
    })

    archive.on('syncing', function () {
      debug('archive syncing')
      state.download.nsync = false
    })

    archive.on('sync', function () {
      debug('archive sync', state.stats.get())
      state.download.nsync = true
      // if we are supposed to exit, do so if we've pulled changes or have given the network the desired wait time
      if (state.opts.exit) {
        if (state.download.modified) {
          return exit()
        } else {
          var delayInMilliseconds = 1000 * state.opts.exit
          setTimeout(exit, delayInMilliseconds)
        }
      }
      if (state.dat.archive.version === 0) {
        // TODO: deal with this.
        // Sync sometimes fires early when it should wait for update.
      }
      bus.emit('render')
    })

    archive.on('update', function () {
      debug('archive update')
      bus.emit('render')
    })

    function exit () {
      if (state.stats.get().version !== archive.version) {
        return state.stats.on('update', exit)
      }
      state.exiting = true
      bus.render()
      process.exit(0)
    }
  }
}
