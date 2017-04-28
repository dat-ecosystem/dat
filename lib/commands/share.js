var Dat = require('dat-node')
var neatLog = require('neat-log')
var archiveUI = require('../ui/archive')
var trackArchive = require('../common/archive')
var onExit = require('../common/exit')
var debug = require('debug')('dat')

module.exports = {
  name: 'share',
  command: share,
  help: [
    'Create and share a Dat archive',
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
  if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

  // TODO: better debug
  // debug('Reading archive in dir', opts.dir)
  var views = [archiveUI]
  // if (opts.remote) views.push(peerUI)
  var neat = neatLog(views, { logspeed: opts.logspeed })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err) return bus.emit('exit:error', err)
      if (!dat.writable) return bus.emit('exit:warn', 'Archive not writable, cannot use share. Please use sync to resume download.')

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')
    })
  })
}
