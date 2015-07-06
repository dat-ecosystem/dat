module.exports = function (db, cb) {
  var headStream = db.heads()

  headStream.on('data', function (data) {
    cb(null, data)
  })

  headStream.on('error', function (err) {
    cb(err)
  })

  headStream.on('end', function () { db.close() })

  return headStream
}
