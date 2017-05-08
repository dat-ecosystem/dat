var Dat = require('dat-node')
var neatLog = require('neat-log')
var archiveUI = require('../ui/archive')
var trackArchive = require('../lib/archive')
var onExit = require('../lib/exit')
// var datJson = require('../dat-json') TODO: dat-node/use module
var debug = require('debug')('dat')

module.exports = {
  name: 'create',
  command: create,
  help: [
    'Create a local Dat archive to share',
    '',
    'Usage: dat create [directory]'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: false,
      help: 'Import files in the given directory'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: true,
      abbr: 'ignore-hidden'
    }
  ]
}

function create (opts) {
  debug('dat create')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  // Force certain options
  opts.errorIfExists = true

  // Todo
  // debug('Creating Dat archive in', opts.dir)

  var neat = neatLog(archiveUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts
    state.joinNetwork = false

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'ExistsError') return bus.emit('exit:warn', 'Archive already exists.')
      if (err) return bus.emit('exit:error', err)

      // TODO: dat.json creation/write key
      state.dat = dat
      bus.emit('dat')
      bus.emit('render')
    })
  })
}
