var debug = require('debug')('bin/get')

var abort = require('../lib/abort.js')
var openDat = require('../lib/open-dat.js')
var usage = require('../lib/usage.js')('get.txt')
var abort = require('../lib/abort.js')

module.exports = {
  name: 'get',
  command: handleRows,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    }
  ]
}

function handleRows (args) {
  debug('handleRows', args)
  if (args.help || !args.dataset || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    var key = args._[0]

    db.get(key, args, function (err, value) {
      if (err) abort(err, args, 'dat get error')
      process.stdout.write(JSON.stringify(value))
    })
  })
}
