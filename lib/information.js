var version = require('../package.json').version

module.exports = function (db, cb) {
  db.status(function (err, status) {
    if (err) return cb(err)

    // dat-core calls it head, we wanna call it version instead
    status.version = status.head
    delete status.head

    if (status.files) status.rows -= status.files
    status.dat = version

    return cb(null, status)
  })
}
