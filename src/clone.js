var peek = require('peek-stream')
var transportStream = require('../lib/transports.js')
var Dat = require('../')

module.exports = function (source, path, args, cb) {
  // static method -- returns a new dat
  // usage:
  //   var Dat = require('dat')
  //   var dat = Dat.clone('/path/to/new/dat', args)

  var transport = transportStream(args.bin)

  try {
    var stream = transport(source)
  } catch (err) {
    cb(new Error('Error: Could not figure out transport type for ' + source))
    return
  }

  stream.on('warn', function (data) {
    if (args.verbose) cb(new Error(data))
  })

  stream.on('error', function (err) {
    var msg = 'Error: '
    if (err.code === 'ENOENT') {
      msg += source + ' is not a valid directory.'
    } else if (err.code === 127) {
      msg += 'Did not find a dat executable. Set it with --bin or add dat to your PATH.'
    } else {
      msg += err.message
    }

    cb(new Error(msg))
  })


  // wait until transport actually emits data before creating target dat
  var peeker = peek({newline: false, maxBuffer: 1}, function (data, swap) {
    args.path = path
    args.createIfMissing = true
    var dat = Dat(args)

    stream.on('finish', function () {
      cb(null, dat)
    })

    dat.db.on('ready', function (err, results, db) {
      if (err) return swap(err)
      var puller = dat.db.pull()
      swap(null, puller)
    })
  })

  peeker.pipe(stream).pipe(peeker)

  peeker.on('error', function (err) {
    cb(err)
  })

}
