var fs = require('fs')
var path = require('path')
var openDat = require('../lib/open-dat.js')

module.exports = {
  name: 'heads',
  command: handleHeads
}

function handleHeads (args) {
  if (args.help) return usage()
  openDat(args, function ready (err, db) {
    if (err) abort(err)

    db.heads()
      .on('data', function head (obj) {
        console.log(obj)
      })
      .on('error', abort)
  })
}

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}

function usage () {
  console.error(fs.readFileSync(path.join(__dirname, '..', 'usage', 'heads.txt')).toString())
}
