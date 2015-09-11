var fs = require('fs')
var path = require('path')
var debug = require('debug')('dat-clone')
var eos = require('end-of-stream')
var peek = require('peek-stream')
var pumpify = require('pumpify')
var transportStream = require('transport-stream')
var initDat = require('../lib/util/init-dat.js')

module.exports = function (source, datPath, args, cb) {
  var transportOpts = {
    command: (args.bin || 'dat') + ' replicate -'
  }
  var transport = transportStream(transportOpts)
  var dotDatPath = path.resolve(path.join(datPath, 'data.dat'))

  try {
    var stream = transport(source)
  } catch (err) {
    cb(new Error('Error: Could not figure out transport type for ' + source))
    return
  }

  stream.on('warn', function (data) {
    if (args.verbose) cb(new Error(data))
  })

  function onerror (err) {
    var msg = 'Error: '
    if (err.code === 'ENOENT') {
      msg += source + ' is not a valid directory.'
      return cb(new Error(msg))
    } else if (err.code === 127) {
      msg += 'Did not find a dat executable. Set it with --bin or add dat to your PATH.'
      return cb(new Error(msg))
    } else {
      return cb(err)
    }
  }

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
          cloneStream.progress = puller.progress
          cloneStream.emit('progress')
        })

        cloneStream.on('end', function () {
          db.flush(function () {
            cb(null, db)
          })
        })

        swap(null, puller)
      })
    })
  })

  stream.on('error', function (err) {
    if (err.level !== 'client-authentication') return onerror(err)
  })

  var cloneStream = pumpify(peeker, stream, peeker)

  cloneStream.progress = {puts: 0, deletes: 0, files: 0}
  eos(cloneStream, function (err) {
    if (!err) return debug('end of stream')
    return onerror(err)
  })
  cloneStream.resume()

  return cloneStream
}
