var prettyBytes = require('pretty-bytes')
var relativeDate = require('relative-date')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('status.txt')
var information = require('../lib/information.js')

module.exports = {
  name: 'status',
  command: handleStatus
}

function handleStatus (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    information(db, args, function (err, status) {
      if (err) abort(err, args)

      if (args.json) {
        console.log(JSON.stringify(status))
      } else {
        var output = ''
        output += 'Current version is ' + status.version
        if (!status.checkout) output += ' (latest)\n'
        else output += ' (checkout)\n'
        output += status.datasets.length + ' ' + pluralize('dataset', status.datasets.length) + ', '
        output += status.rows + ' ' + pluralize('key', status.rows) + ', ' + status.files + ' ' + pluralize('file', status.files) + ', '
        output += status.heads + ' ' + pluralize('fork', status.heads) + ', '
        output += status.versions + ' ' + pluralize('version', status.versions) + ', ' + prettyBytes(status.size) + ' total\n'
        output += 'Last updated ' + relativeDate(status.modified) + ' (' + status.modified + ')'
        console.error(output)
        db.close()
      }
    })
  })
}

function pluralize (name, cnt) {
  return cnt === 1 ? name : name + 's'
}
