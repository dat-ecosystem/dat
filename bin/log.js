var through = require('through2')
var pump = require('pump')
var ndjson = require('ndjson')
var debug = require('debug')('bin/versions')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)

  if (args.help) {
    return usage()
  }

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    var formatter
    if (args.json) formatter = ndjson.serialize()
    else formatter = through.obj(format)
    pump(db.createChangesStream(args), formatter, process.stdout, function done (err) {
      if (err) abort(err, args, 'dat: err in versions')
      db.close()
    })

    function format (obj, enc, next) {
      // its the root node, lets not print it out
      if (obj.files === 0 && obj.puts === 0 && obj.deletes === 0) return next()

      var puts = obj.puts || 0
      var deletes = obj.deletes || 0

      var msg = 'Version: ' + obj.version + ' [+' + puts + ', -' + deletes + ']\n'
      msg += 'Date: ' + obj.date
      if (obj.message) {
        msg += '\n\n   ' + obj.message
      }
      msg += '\n\n'
      next(null, msg)
    }
  })
}
