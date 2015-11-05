var debug = require('debug')('bin/versions')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)
  if (args.help) return usage()

  var db = dat(args)
  var reader = db.createReadStream()

  reader.on('data', function (data) {
    console.log(data.key.toString('hex'))
  })
  reader.on('error', abort)
}
