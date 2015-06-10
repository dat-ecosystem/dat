var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('replicate.txt')
var transportStream = require('../lib/util/transports.js')

module.exports = {
  name: 'replicate',
  command: handleReplicate
}

function handleReplicate (args) {
  if (args._.length === 0) return usage()
  var transports = transportStream(args.bin)

  try {
    var stream = transports(args._[0])
  } catch (err) {
    return usage()
  }

  stream.on('warn', function (data) {
    console.error(data)
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    stream.pipe(db.replicate()).pipe(stream)
  })
}
