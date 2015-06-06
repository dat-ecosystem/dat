var usage = require('../lib/usage.js')('push.txt')
var abort = require('../lib/abort.js')
var progress = require('../lib/progress.js')
var openDat = require('../lib/open-dat.js')
var transportStream = require('../lib/transports.js')

module.exports = {
  name: 'push',
  command: handlePush
}

function handlePush (args) {
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

  stream.on('prefinish', function () {
    openDat(args, function ready (err, db) {
      console.log('Push completed successfully.')
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    stream.pipe(db.push()).pipe(progress('Pushed')).pipe(stream)
  })
}
