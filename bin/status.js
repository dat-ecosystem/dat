var usage = require('../lib/util/usage.js')('status.txt')
var dat = require('..')
var status = require('../lib/status.js')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()
  var db = dat(args)
  status(db, args, function (err, info) {
    if (err) abort(err, args)
    info.heads.map(console.log)
  })
}
