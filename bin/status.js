var prettyBytes = require('pretty-bytes')
var relativeDate = require('relative-date')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('checkout.txt')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    db.status(function (err, status) {
      if (err) abort(err, args)

      // dat-core calls it head, we wanna call it version instead
      status.version = status.head
      delete status.head

      if (args.json) {
        console.log(JSON.stringify(status))
      } else {
        var output = ''
        output += 'Current version is ' + status.version
        if (!status.checkout) output += ' (latest)\n'
        else output += ' (checkout)\n'
        output += status.datasets + ' dataset' + (status.datasets > 1 ? 's, ' : ', ')
        output += status.rows + ' keys, ' + status.files + ' files, '
        output += status.versions + ' versions, ' + prettyBytes(status.size) + ' total\n'
        output += 'Last updated ' + relativeDate(status.modified) + ' (' + status.modified + ')'
        console.error(output)
        db.close()
      }
    })
  })
}
