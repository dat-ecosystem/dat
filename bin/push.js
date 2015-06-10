var usage = require('../lib/util/usage.js')('push.txt')
var abort = require('../lib/util/abort.js')
var progress = require('../lib/util/progress.js')
var openDat = require('../lib/util/open-dat.js')
var transportStream = require('../lib/util/transports.js')

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
      if (err) return abort(err, args)
      if (args.json) return console.log(JSON.stringify({version: db.head}))
      console.error('Push completed successfully.')
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var push = stream.pipe(db.push())
    if (!args.json) push = push.pipe(progress('Pushed', args))
    push.pipe(stream)
  })
}
