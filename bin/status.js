var prettyBytes = require('pretty-bytes')
var relativeDate = require('relative-date')
var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('checkout.txt')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()

  openDat(args, function ready (err, db) {
    if (err) abort(err)

    db.status(function (err, status) {
      if (err) abort(err)
      status.version = status.head
      delete status.head
      if (args.json) {
        console.log(JSON.stringify(status))
      } else {
        var output = ''
        output += 'Current version is ' + status.version
        if (!status.checkout) output += ' (latest)\n'
        else output += '\n'
        output += status.rows + ' keys, ' + status.files + ' files, ' + status.versions + ' versions, ' + prettyBytes(status.size) + ' total\n'
        output += 'Last updated ' + relativeDate(status.modified)
        console.log(output)
      }
    })
  })
}
