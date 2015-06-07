var through = require('through2')
var pump = require('pump')
var ndjson = require('ndjson')
var debug = require('debug')('bin/versions')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('log.txt')

module.exports = {
  name: 'log',
  command: handleLog
}

function handleLog (args) {
  debug('handleLog', args)

  if (args.help) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    handleReadStream(db)
  })

  function handleReadStream (db) {
    var formatter
    if (args.json) formatter = ndjson.serialize()
    else formatter = through.obj(format)
    pump(db.createChangesStream(args), formatter, process.stdout, function done (err) {
      if (err) abort(err, args, 'dat: err in versions')
    })
  }

  function format (obj, enc, next) {
    var files = obj.files || 0
    var puts = obj.puts || 0
    var deletes = obj.deletes || 0

    var msg = 'Version: ' + obj.version + ' [+' + (puts + files) + ', -' + deletes + ']\n'
    msg += 'Date: ' + obj.date + '\n'
    // TODO add message when we have it in the data
    next(null, msg)
  }
}
