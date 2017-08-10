module.exports = {
  name: 'share',
  command: share,
  help: [
    'Create and share a dat',
    'Create a dat, import files, and share to the network.',
    '',
    'Usage: dat share'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: true,
      help: 'Import files from the directory to the database.'
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
      help: 'Watch for changes and import updated files.'
    }
  ]
}

function share (opts) {
  var Dat = require('dat-node')
  var neatLog = require('neat-log')
  var archiveUI = require('../ui/archive')
  var trackArchive = require('../lib/archive')
  var onExit = require('../lib/exit')
  var parseArgs = require('../parse-args')
  var debug = require('debug')('dat')

  if (!opts.dir) {
    opts.dir = parseArgs(opts).dir || process.cwd()
  }

  debug('Sharing archive', opts)

  var views = [archiveUI]
  var neat = neatLog(views, { logspeed: opts.logspeed, quiet: opts.quiet, debug: opts.debug })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'IncompatibleError') return bus.emit('exit:warn', 'Directory contains incompatible dat metadata. Please remove your old .dat folder (rm -rf .dat)')
      else if (err) return bus.emit('exit:error', err)
      if (!dat.writable && !opts.shortcut) return bus.emit('exit:warn', 'Archive not writable, cannot use share. Please use sync to resume download.')

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')
    })
  })
}
