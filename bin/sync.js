var transportStream = require('transport-stream')
var replicator = require('dat-stream-replicator')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('replicate.txt')

module.exports = {
  name: 'sync',
  command: handleSync
}

function handleSync (args) {
  if (args._.length === 0) return usage()
  var transportOpts = {
    command: (args.bin || 'dat') + ' sync -'
  }

  var transport = transportStream(transportOpts)

  try {
    var stream = transport(args._[0])
  } catch (err) {
    return usage()
  }

  stream.on('warn', function (data) {
    console.error(data)
  })

  var db = dat(args)
  stream.pipe(replicator(db)).pipe(stream)
}
