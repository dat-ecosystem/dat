var transportStream = require('transport-stream')
var replicator = require('dat-stream-replicator')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('replicate.txt')

module.exports = {
  name: 'replicate',
  command: handleReplicate
}

function handleReplicate (args) {
  if (args._.length === 0) return usage()
  var transportOpts = {
    command: (args.bin || 'dat') + ' replicate -'
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
  var replicationStream = replicator(db, {mode: 'sync'})
  stream.pipe(replicationStream).pipe(stream)
}
