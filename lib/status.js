var getConfig = require('./util/config.js')
var version = require('../package.json').version

module.exports = function (db, args, cb) {
  // Returns information about this dat. For the outside world!
  db.heads(function (err, heads) {
    if (err) return cb(err)
    var status = {
      heads: []
    }

    heads.map(function (head) {
      status.heads.push(head.key.toString('hex'))
    })

    var config = getConfig(args)

    status.dat = {
      version: version,
      name: config.name,
      description: config.description,
      publisher: config.publisher
    }

    return cb(null, status)
  })
}
