var url = require('url')
var usage = require('../lib/usage.js')('pull.txt')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var transports = require('../lib/transports')

module.exports = {
  name: 'pull',
  command: handlePull
}

function handlePull (args) {
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
    if (err) return abort(err)
    stream.pipe(db.pull()).pipe(stream)
  })
}
