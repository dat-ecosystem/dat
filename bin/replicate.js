var debug = require('debug')('bin/replicate')
var streamReplicator = require('dat-stream-replicator')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('write.txt')

module.exports = {
  name: 'replicate',
  command: handleReplicate,
  options: []
}

function handleReplicate (args) {
  debug('handleReplicate', args)
  if (args.help) return usage()

}
