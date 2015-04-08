var openDat = require('../lib/open-dat.js')

module.exports = {
  name: 'receive-replication',
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

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}
