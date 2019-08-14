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
  const Dat = require('dat-node')
  const neatLog = require('neat-log')
  const statusUI = require('../ui/status')
  const onExit = require('../lib/exit')
  const parseArgs = require('../parse-args')
  const debug = require('debug')('dat')

  debug('dat status')
  if (!opts.dir) {
    opts.dir = parseArgs(opts).dir || process.cwd()
  }
  opts.createIfMissing = false // sync must always be a resumed archive

  const neat = neatLog(statusUI, { logspeed: opts.logspeed, quiet: opts.quiet, debug: opts.debug })
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'Sorry, could not find a dat in this directory.')
      if (err) return bus.emit('exit:error', err)

      state.dat = dat
      const stats = dat.trackStats()
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
