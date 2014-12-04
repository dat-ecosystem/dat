var path = require('path')
var fs = require('fs')
var tty = require('tty')

var isTTY = tty.isatty(0)

module.exports = blobsPut

blobsPut.usage = 'dat blobs put <row> [file-path-to-read] [--name=blob-name-to-use-as-key] [--version=row-version-to-update]'

function blobsPut(dat, opts, cb) {
  var args = opts._.slice(2)
  if (args.length === 0) return cb(new Error('Usage ' + blobsPut.usage))
  var key = args[0]
  var blob = args[1]
  if (!opts.name && !blob) return cb(new Error('Must either specify a blob name (--name) to use or a filename. '))
  var row = { key: key }
  var version = opts.version || opts.v
  
  dat.get(key, { version: version }, function(err, existing) {
    if (existing) {
      if (!version) return cb(new Error('Conflict: Row already exists but no version was specified.'))
      row = existing
    }
    var blobKey = opts.name || path.basename(blob)
    var ws = dat.createBlobWriteStream(blobKey, row, function(err, updated) {
      if (err) return cb(err)
      console.log('Attached ' + blobKey + ' successfully to', updated.key)
      cb()
    })
    
    if (blob && blob !== '-') {
      fs.createReadStream(blob).pipe(ws)
    } else if (blob === '-' || !isTTY) {
      if (!opts.quiet) console.log('No blob file specified, using STDIN as input')
      process.stdin.pipe(ws)
    } else {
      ws.destroy(new Error('No blob data was supplied'))
    }
  })
}
