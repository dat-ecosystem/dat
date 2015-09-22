var dat = require('../../')

module.exports = function (args, cb) {
  if (!args) args = {}
  if (!args.path) args.path = process.cwd()
  var db = dat(args.path)

  if (args.checkout) db = db.checkout(args.checkout)

  db.on('error', function error (err) {
    // improve error messages
    if (err.message === 'No dat here') err.message = 'dat: This is not a dat repository, you need to dat init first'
    else err.message = 'dat: read error: ' + err.message
    cb(err)
  })

  db.on('ready', function ready () {
    cb(null, db)
  })
}
