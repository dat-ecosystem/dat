var speed = require('speedometer')
var xtend = Object.assign

module.exports = trackImport

function trackImport (state, bus) {
  if (state.dat) return track()
  bus.once('dat', track)

  function track () {
    var progress = state.dat.importFiles(state.opts)
    state.importer = xtend({
      progress: 0,
      count: progress.count
    }, state.importer)
    bus.emit('dat:importer')

    var indexSpeed = speed()
    var counting = setInterval(function () {
      // Update file count in progress counting (for big dirs)
      bus.emit('render')
    }, state.opts.logspeed)

    progress.on('count', function (count) {
      clearInterval(counting)
      state.importer.countFinished = true
      bus.emit('render')
    })

    progress.on('put', function (src, dst) {
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
      state.importer.progress += chunk.length
      indexSpeed(chunk.length)
      state.importer.indexSpeed = indexSpeed()
      bus.emit('render')
    })

    progress.on('put-end', function (src, dst) {
      state.importer.fileImport = null
      bus.emit('render')
    })

    progress.on('end', function (src, dst) {
      state.importer.fileImport = null
      bus.emit('render')
    })
  }
}
