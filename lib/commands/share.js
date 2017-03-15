var Dat = require('dat-node')
var share = require('../share')
var exit = require('../ui').exitErr
var debug = require('debug')('dat')

module.exports = {
  name: 'share',
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
  ],
  command: function (opts) {
    if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

    // Gets overwritten by logger.
    // Logging starts after Dat cb for lib/download sync
    // So we need this to show something right away
    if (!opts.quiet && !opts.debug) process.stdout.write('Starting Dat...')

    // Set default options
    opts.exit = false

    debug('Reading archive in dir', opts.dir)

    Dat(opts.dir, opts, function (err, dat) {
      if (err) return exit(err)
      if (!dat.owner) return exit('Existing archive that you do not own. Use `dat sync` to download updates.')

      // TODO: dat.json stuff we do in create.js?
      share('sync', opts, dat)
    })
  }
}
