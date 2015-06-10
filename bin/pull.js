var config = require('../lib/util/config.js')()
var usage = require('../lib/util/usage.js')('pull.txt')
var progress = require('../lib/util/progress.js')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var transportStream = require('../lib/util/transports.js')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
  var remote = config.remote || args._[0]
  if (!remote) return usage()

  var transports = transportStream(args.bin)

  try {
    var stream = transports(remote)
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
      var forks = 'some number of' // TODO
      var msg = ''
      msg += 'Pull completed successfully. You now have ' + forks + ' forks ;)\n'
      msg += 'Current version is now ' + db.head
      console.error(msg)
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var pull = stream.pipe(db.pull())
    if (!args.json) pull = pull.pipe(progress('Pulled', args))
    pull.pipe(stream)
  })
}
