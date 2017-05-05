var xtend = Object.assign

module.exports = trackDownload

function trackDownload (state, bus) {
  if (state.hasContent) return track()
  bus.once('archive:content', track)

  function track () {
    var archive = state.dat.archive

    state.download = xtend({
      modified: false
    }, {})

    archive.content.on('clear', function () {
      state.download.modified = true
    })

    archive.content.on('download', function (index, data) {
      state.download.modified = true
    })

    archive.on('syncing', function () {
      state.download.nsync = false
    })

    archive.on('sync', function () {
      state.download.nsync = true
      // if (state.download.modified && !state.opts.live) {
      //   state.downloadExit = true
      //   bus.render()
      //   process.exit()
      // }
      bus.emit('render')
    })

    archive.on('update', function () {
      bus.emit('render')
    })
  }
}
