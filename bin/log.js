var debug = require('debug')('bin/versions')
var dat = require('..')
var relativeDate = require('relative-date')
var abort = require('../lib/util/abort.js')
var messages = require('../lib/messages.js')
var usage = require('../lib/util/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)
  if (args.help) return usage()

  var db = dat(args)
  var reader = db.createReadStream({reverse: true})

  reader.on('data', function (data) {
    var node = messages.Commit.decode(data.value)
    var msg = 'Version: ' + data.key.toString('hex')
    msg += '\nDate:    ' + relativeDate(node.modified)
    msg += '\n\n   ' + node.message
    console.error(msg)
  })
  reader.on('error', abort)
}
