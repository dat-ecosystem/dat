var readme = require('./util/readme.js')
var getConfig = require('./util/config.js')
var version = require('../package.json').version

module.exports = function (db, args, cb) {
  // Returns information about this dat. For the outside world!
  db.status(function (err, status) {
    if (err) return cb(err)

    // dat-core calls it head, we wanna call it version instead
    status.version = status.head
    delete status.head

    if (status.files) status.rows -= status.files

    readme.get(db, function (err, readme) {
      if (err) onerror(err)
      else done(null, readme)
    })

    function onerror (err) {
      if (err.message.match(/Key not found/)) return done(null, '')
      else return cb(err)
    }

    function done (err, data) {
      if (err) return onerror(err)
      var config = getConfig(args)

      status.dat = {
        version: version,
        name: config.name,
        description: config.description,
        publisher: config.publisher,
        readme: data
      }

      return cb(null, status)
    }
  })
}
