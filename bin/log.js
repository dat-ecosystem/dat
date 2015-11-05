var through = require('through2')
var pump = require('pump')
var ndjson = require('ndjson')
var debug = require('debug')('bin/versions')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)

  if (args.help) {
    return usage()
  }
  throw new Error('Unimplemented')
}
