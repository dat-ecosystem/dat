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
    // TODO: use sparse but only replicate local latest?
    // only want to replicate from local, otherwise may download old versions + pollute local storage
    if (opts.serve) dat.joinNetwork({download: false})

    if (opts.list) list()
    else if (opts.delete) clear()
    else backup()

    function clear () {

    }

    function list () {
      var stream = dat.archive.history()
      stream.on('data', function (data) {
        if (!data.value) return
        // TODO: don't print dirs
        var blocks = {start: data.value.offset, end: data.value.offset + data.value.blocks}
        var missing = false
        for (var i = blocks.start; i < blocks.end; i++) {
          if (!dat.archive.content.has(i)) missing = true
        }
        if (!missing) {
          console.log(data.name, new Date(data.value.mtime).toLocaleString(), '(version:', data.version, ')')
        }
      })
    }

    function backup () {
      var stream = dat.archive.replicate({live: opts.live})
      stream.on('end', function () {
        cb()
      })
      stream.pipe(archive.replicate()).pipe(stream)
    }
  })
}
