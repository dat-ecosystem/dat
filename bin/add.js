var fs = require('fs')
var pump = require('pump')
var through = require('through2')
var uuid = require('cuid')
var debug = require('debug')('bin/add')
var parseInputStream = require('../lib/parse-input-stream.js')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('add.txt')

module.exports = {
  name: 'add',
  command: handleAdd,
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

function handleAdd (args) {
  debug('handleAdd', args)

  if (args.help || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleInputStream(db)
  })

  function handleInputStream (db) {
    var inputStream
    if (args._[0] === '-') inputStream = process.stdin
    else inputStream = fs.createReadStream(args._[0])

    var transform = through.obj(function (obj, enc, next) {
      var key = obj[args.key] || obj.key || uuid()
      next(null, {type: 'put', key: key, value: obj})
    })

    pump(inputStream, parseInputStream(args), transform, db.createWriteStream(), function done (err) {
      if (err) abort(err, 'Error adding data')
      console.error('Done adding data')
    })
  }
}
