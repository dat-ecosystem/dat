var fs = require('fs')
var path = require('path')
var peek = require('peek-stream')
var pump = require('pump')
var transportStream = require('../lib/util/transports.js')
var initDat = require('../lib/util/init-dat.js')
var debugStream = require('debug-stream')('dat/clone')

module.exports = function (source, datPath, args, cb) {
  var transport = transportStream(args.bin)
  var dotDatPath = path.resolve(path.join(datPath, 'data.dat'))
  var database

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

    fs.exists(dotDatPath, function (exists) {
      if (exists) return swap(new Error('destination path ' + dotDatPath + ' already exists'))
      args.prompt = false
      args.writeConfig = false
      initDat(args, function (err, results, db) {
        if (err) return swap(err)
        var puller = db.pull()

        // forward event
        puller.on('progress', function () {
          peeker.progress = puller.progress
          peeker.emit('progress')
        })

        database = db
        swap(null, puller)
      })
    })
  })

  peeker.progress = {puts: 0, deletes: 0, files: 0}
  pump(peeker, stream, debugStream('transport data: %s'), peeker, function (err) {
    if (err) return cb(err)
    cb(null, database)
  })

  return peeker
}
