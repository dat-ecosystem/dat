var pump = require('pump')
var debug = require('debug')('bin/read')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('read.txt')

module.exports = {
  name: 'read',
  command: handleRead,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handleRead (args) {
  debug('handleRead', args)

  if (args.help || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    handleReadStream(db)
  })

  function handleReadStream (db) {
    var key = args._[0]

    var opts = {
      dataset: args.d
    }

    pump(db.createFileReadStream(key, opts), process.stdout, function done (err) {
      if (err) abort(err, args, 'dat: err in read')
    })
  }
}
