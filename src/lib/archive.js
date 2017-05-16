var doImport = require('./import-progress')
var stats = require('./stats')
var network = require('./network')
var download = require('./download')
var serve = require('./serve-http')

module.exports = function (state, bus) {
  bus.once('dat', function () {
    state.writable = state.dat.writable
    state.joinNetwork = !(state.joinNetwork === false)

    stats(state, bus)
    if (state.joinNetwork) network(state, bus)
    if (state.opts.http) serve(state, bus)

    if (state.writable && state.opts.import) doImport(state, bus)
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
