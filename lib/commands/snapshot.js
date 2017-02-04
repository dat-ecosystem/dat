var create = require('./create')
var debug = require('debug')('dat')

module.exports = {
  name: 'snapshot',
  help: [
    'Create a snapshot Dat archive',
    '',
    'Usage: dat snapshot'
  ].join('\n'),
  options: [],
  command: function snapshot (opts) {
    if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

    // Force these options for snapshot command
    opts.errorIfExists = true
    opts.live = false
    opts.import = true

    debug('Creating snapshot archive in', opts.dir)
    create.command(opts)
  }
}
