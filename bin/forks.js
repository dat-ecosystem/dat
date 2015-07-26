var formatData = require('format-data')
var through = require('through2')
var pump = require('pump')
var usage = require('../lib/util/usage.js')('forks.txt')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')

module.exports = {
  name: 'forks',
  command: handleForks
}

function handleForks (args) {
  if (args.help) return usage()

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    var stream = db.heads()

    var formatter
    if (args.json) {
      formatter = formatData({
        format: 'json',
        style: 'object',
        key: 'forks',
        suffix: '}\n'
      })
    } else {
      formatter = through.obj(function (obj, enc, next) {
        next(null, obj + '\n')
      })
    }

    pump(stream, formatter, process.stdout, function (err) {
      if (err) abort(err, args, 'Error getting fork list')
      db.close()
    })
  })
}
