var usage = require('../lib/util/usage.js')('status.txt')
var dat = require('..')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()
  var db = dat(args)
  db.heads(function (err, heads) {
    if (err) abort(err, args)
    heads.map(function (head) {
      console.log(head.key.toString('hex'))
    })
  })
}
