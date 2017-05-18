var Dat = require('dat-node')
var neatLog = require('neat-log')
var archiveUI = require('../ui/archive')
var trackArchive = require('../lib/archive')
var onExit = require('../lib/exit')
var debug = require('debug')('dat')

module.exports = {
  name: 'sync',
  command: sync,
  help: [
    'Sync a Dat archive with the network',
    'Watch and import file changes (if you created the archive)',
    '',
    'Usage: dat sync'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: true,
      help: 'Import files from the directory to the database (Dat Writable).'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: true,
      abbr: 'ignore-hidden'
    },
    {
      name: 'watch',
      boolean: true,
      default: true,
      help: 'Watch for changes and import updated files (Dat Writable).'
    },
    {
      name: 'show-key',
      boolean: true,
      default: false,
      help: 'Print out the dat key (Dat Not Writable).'
    }
  ]
}

function sync (opts) {
  debug('dat sync')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()
  opts.showKey = opts['show-key'] // using abbr in option makes printed help confusing

  // Set default options (some of these may be exposed to CLI eventually)
  opts.createIfMissing = false // sync must always be a resumed archive
  opts.exit = false
  // debug('Reading archive in dir', opts.dir)

  var neat = neatLog(archiveUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'No existing archive in this directory.')
      if (err) return bus.emit('exit:error', err)

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')
    })
  })
}
