var Dat = require('dat-node')
var download = require('../download')
var share = require('../share')
var exitErr = require('../ui').exitErr
var debug = require('debug')('dat')

module.exports = {
  name: 'sync',
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

    // Set default options (some of these may be exposed to CLI eventually)
    opts.createIfMissing = false // sync must always be a resumed archive
    opts.exit = false

    debug('Reading archive in dir', opts.dir)

    Dat(opts.dir, opts, function (err, dat) {
      if (err && (!err.message || err.message.indexOf('No existing') === -1)) return exitErr(err)
      else if (err || !dat.resumed) return exitErr('No existing archive. Please use `dat create` or `dat clone` first.')
      if (dat.writable) debug('Archive owner, syncing local updates to network')
      else debug('Not archive owner, syncing remote updates')

      if (!dat.writable) return download('sync', opts, dat)
      // TODO: dat.owner is false for snapshot on resume? bug?
      // if (!dat.archive.live) opts.import = false
      share('sync', opts, dat)
    })
  }
}
