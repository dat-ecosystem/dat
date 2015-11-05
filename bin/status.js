var prettyBytes = require('pretty-bytes')
var relativeDate = require('relative-date')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('status.txt')
var information = require('../lib/information.js')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()

  throw new Error('Unimplemented')
}

function pluralize (name, cnt) {
  return cnt === 1 ? name : name + 's'
}
