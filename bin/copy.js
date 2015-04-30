var fs = require('fs')
var pump = require('pump')
var through = require('through2')
var debug = require('debug')('bin/copy')
var formatData = require('format-data')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('copy.txt')

module.exports = {
  name: 'copy',
  command: handleExport,
  options: [
    {
      name: 'name',
      boolean: false,
      abbr: 'n'
    },
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    }
  ]
}

function handleExport (args) {
  debug('handlecopy', args)

  if (args.help) {
    usage()
    abort()
  }

  if (!args.f) {
    args.f = 'csv'
  }

  if (!args.n) {
    args.n = 'default'
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleOuputStream(db)
  })

  function handleOuputStream (db) {
    var outputStream
    if (!args._[0]) outputStream = process.stdout
    else outputStream = fs.createWriteStream(args._[0])

    var parseReadStream = through.obj(function (data, enc, next) {
      next(null, data.value)
    })

    pump(db.createReadStream(), parseReadStream, formatData(args.f), outputStream, function done (err) {
      if (err) abort(err, 'Error adding data')
      console.error('Done adding data')
    })
  }
}
