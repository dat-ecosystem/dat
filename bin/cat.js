var pump = require('pump')
var debug = require('debug')('bin/cat')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('cat.txt')

module.exports = {
  name: 'cat',
  command: handleCat,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handleCat (args) {
  debug('handleCat', args)

  if (args.help || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleReadStream(db)
  })

  function handleReadStream (db) {
    var key = args._[0]

    var opts = {
      dataset: args.d
    }

    pump(db.createFileReadStream(key, opts), process.stdout, function done (err) {
      if (err) abort(err, 'dat: err in cat')
    })
  }
}
