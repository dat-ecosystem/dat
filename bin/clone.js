var abort = require('../lib/abort.js')
var initDat = require('../lib/init-dat.js')
var transportStream = require('../lib/transports.js')
var usage = require('../lib/usage.js')('clone.txt')

module.exports = {
  name: 'clone',
  command: handleClone
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var source = args._[0]
  if (args._[1]) args.path = args._[1]
  var transport = transportStream(args.bin)

  try {
    var stream = transport(source)
  } catch (err) {
    usage()
    console.error('Error: Could not figure out transport type for', source)
    return
  }

  stream.on('warn', function (data) {
    if (args.verbose) console.error(data)
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
    console.error(msg)
  })

  stream.on('finish', function () {
    console.error('Clone from remote has completed.')
  })

  initDat(args, function (err, results, db) {
    if (err) return abort(err, args)
    stream.pipe(db.pull()).pipe(stream)
  })
}
