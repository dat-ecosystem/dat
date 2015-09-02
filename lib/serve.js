var pump = require('pump')
var debug = require('debug')('dat-serve')
var debugStream = require('debug-stream')

var version = require('../package.json').version

module.exports = {
  information: function (db, args, cb) {
    db.status(function (err, status) {
      if (err) return cb(err)
      db.listDatasets(function (err, datasets) {
        if (err) return cb(err)
        var result = {
          dat: true,
          version: version,
          status: status,
          datasets: datasets
        }
        cb(null, JSON.stringify(result))
      })
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
    else return pump(loggers.in(), replicate, loggers.out())
  }
}

function debugLogger (prefix) {
  return function (buf) {
    debug(prefix, {length: buf.length})
  }
}
