var pumpify = require('pumpify')
var debug = require('debug')('dat-serve')
var debugStream = require('debug-stream')
var information = require('./information.js')

module.exports = {
  information: function (db, args, cb) {
    information(db, args, function (err, data) {
      if (err) return cb(err)
      cb(null, JSON.stringify(data))
    })
  },
  replication: function (db, args) {
    var replicate = args.readonly ? db.push() : db.replicate()

    var start = Date.now()
    replicate.on('finish', function () {
      debug('replication finished in', (Date.now() - start) + 'ms')
    })

    var loggers = {
      out: debugStream(debugLogger('out')),
      in: debugStream(debugLogger('in'))
    }

    if (!loggers.out.enabled) return replicate
    else return pumpify(loggers.in(), replicate, loggers.out())
  }
}

function debugLogger (prefix) {
  return function (buf) {
    debug(prefix, {length: buf.length})
  }
}
