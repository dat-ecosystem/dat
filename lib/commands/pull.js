var Dat = require('dat-node')
var neatLog = require('neat-log')
var output = require('neat-log/output')
var archiveUI = require('../ui/archive')
var trackArchive = require('../common/archive')
var onExit = require('../common/exit')
var debug = require('debug')('dat')

module.exports = {
  name: 'pull',
  command: pull,
  help: [
    'Pull updates from a cloned Dat archive',
    '',
    'Usage: dat pull'
  ].join('\n'),
  options: [
    {
      name: 'upload',
      boolean: true,
      default: false,
      help: 'upload data to other peers while pulling'
    }
  ]
}

function pull (opts) {
  if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

  // Force these options for pull command
  opts.createIfMissing = false
  opts.exit = true

  var neat = neatLog(archiveUI, { logspeed: opts.logspeed })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'No existing archive in this directory. Use clone to download a new archive.')
      if (err) return bus.emit('exit:error', err)
      if (dat.writable) return bus.emit('exit:warn', 'Archive is writable. Cannot pull your own archive.')

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')

      bus.once('network:callback', function () {
        if (!dat.network.connected) {
          var msg = output`
            Dat could not find any connections for that link.

            Run 'dat doctor' if you keep having trouble.
          `
          bus.emit('exit:warn', msg)
        }
      })
    })
  })
}
