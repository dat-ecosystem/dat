var assert = require('assert')
var path = require('path')
var Dat = require('dat-node')
var homedir = require('os-homedir')

module.exports = function (source, opts, cb) {
  assert.ok(source, 'history: source required')
  if (!opts) opts = {}
  var archive = source.archive || source

  if (!opts.dir) {
    var rootDir = path.join(homedir(), '.dat', 'history')
    var discKey = archive.discoveryKey
    if (!discKey) throw new Error('Discovery key required')
    if (typeof discKey !== 'string') discKey = discKey.toString('hex')
    dir = path.join(rootDir, discKey.slice(0, 2), discKey.slice(2))
  }

  Dat(dir, {key: source.key, latest: false}, function (err, dat) {
    if (opts.serve) dat.joinNetwork()
    var stream = dat.archive.replicate({live: opts.live})
    stream.on('end', function () {
      cb()
    })
    stream.pipe(archive.replicate()).pipe(stream)
  })
}
