var Dat = require('dat-node')
var neatLog = require('neat-log')
var output = require('neat-log/output')
var archiveUI = require('../ui/archive')
var trackArchive = require('../lib/archive')
var discoveryExit = require('../lib/discovery-exit')
var onExit = require('../lib/exit')
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
  debug('dat pull')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  // Force these options for pull command
  opts.createIfMissing = false
  opts.exit = true

  var neat = neatLog(archiveUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(trackArchive)
  neat.use(discoveryExit)
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
    })
  })
}
