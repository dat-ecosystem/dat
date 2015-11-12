var debug = require('debug')('bin/versions')
var dat = require('..')
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
    console.log(data.key.toString('hex'), node.message)
    var value = JSON.parse(node.value)
    value.map(function (file) { console.log(file.basename) })
  })
  reader.on('error', abort)
}
