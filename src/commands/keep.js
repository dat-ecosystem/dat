var Dat = require('dat-node')
var neatLog = require('neat-log')
var keepUI = require('../ui/keep')
// var trackArchive = require('../lib/archive')
var onExit = require('../lib/exit')
var history = require('../history')
var debug = require('debug')('dat')

module.exports = {
  name: 'keep',
  command: keep,
  help: [
    'keep a Dat archive with the network',
    'Watch and import file changes (if you created the archive)',
    '',
    'Usage: dat keep'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: false,
      help: '(Dat Writable) Import files from the directory to the database (Dat Writable).'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: false,
      abbr: 'ignore-hidden'
    }
  ]
}

function keep (opts) {
  debug('dat keep')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()
  opts.showKey = opts['show-key'] // using abbr in option makes printed help confusing

  // Set default options (some of these may be exposed to CLI eventually)
  opts.createIfMissing = false // keep must always be a resumed archive
  // opts.exit = true
  // debug('Reading archive in dir', opts.dir)

  var neat = neatLog(keepUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  // neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'No existing archive in this directory.')
      if (err) return bus.emit('exit:error', err)

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')

      if (dat.writable) return importKeep()
      history(dat, {serve: opts.serve})

      function importKeep () {
        state.importing = true
        dat.importFiles(function (err) {
          state.importing = false
          history(dat, {serve: opts.serve}, function () {
            state.history = true
            bus.emit('render')
          })
          bus.emit('render')
        })
        bus.emit('render')
      }
    })
  })
}
