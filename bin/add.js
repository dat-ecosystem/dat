var pump = require('pump')
var basename = require('path').basename
var debug = require('debug')('bin/write')
var openDat = require('../lib/util/open-dat.js')
var createFileStream = require('../lib/util/create-file-stream.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('write.txt')
var progress = require('../lib/util/progress.js')

module.exports = {
  name: 'add',
  command: handleWrite,
  options: []
}

function handleWrite (args) {
  debug('handleAdd', args)

  if (args.help || args._.length === 0) {
    return usage()
  }

  throw new Error('unimplemented')
}
