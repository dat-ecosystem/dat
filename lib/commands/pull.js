var Dat = require('dat-node')
var download = require('../download')
var exitErr = require('../ui').exitErr
var debug = require('debug')('dat')

module.exports = {
  name: 'pull',
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
  ],
  command: function (opts) {
    if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

    // Force these options for pull command
    opts.createIfMissing = false
    opts.exit = true

    debug('Pulling Dat archive in', opts.dir)
    Dat(opts.dir, opts, function (err, dat) {
      if (err) return exitErr(err)
      if (dat.owner) return exitErr('Cannot pull an archive that you own.')
      download('pull', opts, dat)
    })
  }
}
