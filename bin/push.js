var usage = require('../lib/usage.js')('push.txt')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var transports = require('../lib/transports')

module.exports = {
  name: 'push',
  command: handlePush
}

function handlePush (args) {
  if (args._.length === 0) return usage()

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
    stream.pipe(db.push()).pipe(stream)
  })
}
