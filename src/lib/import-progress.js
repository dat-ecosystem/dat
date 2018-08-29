var xtend = Object.assign

module.exports = trackImport

function trackImport (state, bus) {
  if (state.dat) return track()
  bus.once('dat', track)

  function track () {
    var progress = state.dat.importFiles(state.opts, function (err) {
      if (err) return bus.emit('exit:error', err)
      state.importer.fileImport = null
      state.exiting = true
      bus.emit('render')
    })
    state.importer = xtend({
      importedBytes: 0,
      count: progress.count,
      liveImports: [],
      indexSpeed: progress.indexSpeed
    }, progress)
    bus.emit('dat:importer')

    var counting = setInterval(function () {
      // Update file count in progress counting (for big dirs)
      bus.emit('render')
    }, state.opts.logspeed)

    progress.on('count', function (count) {
      clearInterval(counting)
      state.count = count
      state.count.done = true
      bus.emit('render')
    })

    progress.on('del', function (src, dst) {
      if (src.live) state.importer.liveImports.push({ src: src, dst: dst, type: 'del' })
    })

    progress.on('put', function (src, dst) {
      if (src.live) state.importer.liveImports.push({ src: src, dst: dst, type: 'put' })
      if (src.stat.isDirectory()) return
      state.importer.fileImport = {
        src: src,
        dst: dst,
        progress: 0,
        type: 'put'
      }
      bus.emit('render')
    })

    progress.on('put-data', function (chunk, src, dst) {
      state.importer.fileImport.progress += chunk.length
      if (!src.live) state.importer.importedBytes += chunk.length // don't include live in total
      state.importer.indexSpeed = progress.indexSpeed
      bus.emit('render')
    })
  }
}
