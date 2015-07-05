var peek = require('peek-stream')
var fs = require('fs')
var path = require('path')
var transportStream = require('../lib/util/transports.js')
var initDat = require('../lib/util/init-dat.js')

module.exports = function (source, datPath, args, cb) {
  var transport = transportStream(args.bin)
  var dotDatPath = path.resolve(path.join(datPath, '.dat'))

  fs.exists(dotDatPath, function (exists) {
    if (exists) return cb(new Error('destination path ' + dotDatPath + ' already exists'))
  })

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
      cb(new Error(msg))
    } else if (err.code === 127) {
      msg += 'Did not find a dat executable. Set it with --bin or add dat to your PATH.'
      cb(new Error(msg))
    } else {
      cb(err)
    }
  })

  // wait until transport actually emits data before creating target dat
  var peeker = peek({newline: false, maxBuffer: 1}, function (data, swap) {
    args.path = datPath

    initDat(args, function (err, results, db) {
      if (err) return swap(err)
      var puller = db.pull()

      stream.on('finish', function () {
        cb(null, db)
      })

      // forward event
      puller.on('progress', function () {
        peeker.progress = puller.progress
        peeker.emit('progress')
      })

      swap(null, puller)
    })
  })

  peeker.pipe(stream).pipe(peeker)
  peeker.progress = {puts: 0, deletes: 0, files: 0}

  peeker.on('error', function (err) {
    cb(err)
  })

  return peeker
}
