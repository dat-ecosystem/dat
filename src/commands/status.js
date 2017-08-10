module.exports = {
  name: 'status',
  command: status,
  help: [
    'Get information on about the Dat in a directory.',
    '',
    'Usage: dat status'
  ].join('\n'),
  options: []
}

function status (opts) {
  var Dat = require('dat-node')
  var neatLog = require('neat-log')
  var statusUI = require('../ui/status')
  var onExit = require('../lib/exit')
  var parseArgs = require('../parse-args')
  var debug = require('debug')('dat')

  debug('dat status')
  if (!opts.dir) {
    opts.dir = parseArgs(opts).dir || process.cwd()
  }
  opts.createIfMissing = false // sync must always be a resumed archive

  var neat = neatLog(statusUI, { logspeed: opts.logspeed, quiet: opts.quiet, debug: opts.debug })
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'Sorry, could not find a dat in this directory.')
      if (err) return bus.emit('exit:error', err)

      state.dat = dat
      var stats = dat.trackStats()
      if (stats.get().version === dat.version) return exit()
      stats.on('update', function () {
        if (stats.get().version === dat.version) return exit()
      })

      function exit () {
        bus.render()
        process.exit(0)
      }
    })
  })
}
