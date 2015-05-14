var debug = require('debug')('bin/put')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('put.txt')

module.exports = {
  name: 'put',
  command: handlePut,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handlePut (args) {
  debug('handlePut', args)

  if (args.help || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleInputStream(db)
  })

  function handleInputStream (db) {
    var key = args._[0]
    var value = args._[1]

    var opts = {
      dataset: args.d
    }

    db.put(key, value, opts, function (err, key) {
      if (err) abort(err, 'dat: err in put')
      console.error('Done adding data.')
    })
  }
}
