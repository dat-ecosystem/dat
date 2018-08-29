var debug = require('debug')('dat')
var path = require('path')
var EventEmitter = require('events').EventEmitter
var doImport = require('./import-progress')
var stats = require('./stats')
var network = require('./network')
var download = require('./download')
var serve = require('./serve-http')

module.exports = function (state, bus) {
  state.warnings = state.warnings || []
  bus.once('dat', function () {
    state.writable = state.dat.writable
    state.joinNetwork = !(state.joinNetwork === false)

    stats(state, bus)
    if (state.joinNetwork) network(state, bus)
    if (state.opts.http) serve(state, bus)

    if (state.writable && state.opts.import) doImport(state, bus)
    else if (state.opts.sparse) selectiveSync(state, bus)
    else download(state, bus)

    if (state.dat.archive.content) return bus.emit('archive:content')
    state.dat.archive.once('content', function () {
      bus.emit('archive:content')
    })
  })

  bus.once('archive:content', function () {
    state.hasContent = true
  })
}

function selectiveSync (state, bus) {
  var archive = state.dat.archive
  debug('sparse mode. downloading metadata')
  var emitter = new EventEmitter()

  function download (entry) {
    debug('selected', entry)
    archive.stat(entry, function (err, stat) {
      if (err) return state.warnings.push(err.message)
      if (stat.isDirectory()) downloadDir(entry, stat)
      if (stat.isFile()) downloadFile(entry, stat)
    })
  }

  function downloadDir (dirname, stat) {
    debug('downloading dir', dirname)
    archive.readdir(dirname, function (err, entries) {
      if (err) return bus.emit('exit:error', err)
      entries.forEach(function (entry) {
        emitter.emit('download', path.join(dirname, entry))
      })
    })
  }

  function downloadFile (entry, stat) {
    var start = stat.offset
    var end = stat.offset + stat.blocks
    state.selectedByteLength += stat.size
    bus.emit('render')
    if (start === 0 && end === 0) return
    debug('downloading', entry, start, end)
    archive.content.download({ start, end }, function () {
      debug('success', entry)
    })
  }

  emitter.on('download', download)
  if (state.opts.selectedFiles) state.opts.selectedFiles.forEach(download)

  if (state.opts.empty) {
    archive.metadata.update(function () {
      return bus.emit('exit:warn', `Dat successfully created in empty mode. Download files using pull or sync.`)
    })
  }

  archive.on('update', function () {
    debug('archive update')
    bus.emit('render')
  })
}
