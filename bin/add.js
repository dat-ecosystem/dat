var debug = require('debug')('bin/add')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('write.txt')

module.exports = {
  name: 'add',
  command: handleAdd,
  options: []
}

function handleAdd (args) {
  debug('handleAdd', args)

  if (args.help || args._.length === 0) {
    return usage()
  }

  

}
