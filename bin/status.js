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

    var heads = []
    db.heads()
    .on('data', function head (obj) {
      heads.push(obj)
    })
    .on('error', abort)
    .on('end', function () {
      if (heads.length > 1) console.error('Current versions are\n' + heads.join('\n'))
      else console.error('Current version is now', heads[0])
    })

  })
}
