var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')

module.exports = {
  name: 'replicate',
  command: handlePush
}

function handlePush (args) {
  openDat(args, function ready (err, db) {
    if (err) abort(err)
    receivePush(db)
  })

  function receivePush (db, remote) {
    var replicateStream = db.replicate()
    process.stdin.pipe(replicateStream).pipe(process.stdout)
    replicateStream.on('end', function onEnd () {
      process.exit(0)
    })
  }
}
