var usage = require('../lib/usage.js')('pull.txt')
var progress = require('../lib/progress.js')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var transportStream = require('../lib/transports.js')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
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
      var forks = 'some number of' // TODO
      var msg = ''
      msg += 'Pull completed successfully. You now have ' + forks + ' forks ;)\n'
      msg += 'Current version is now ' + db.head
      console.log(msg)
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    stream.pipe(db.pull()).pipe(progress('Pulled')).pipe(stream)
  })
}
