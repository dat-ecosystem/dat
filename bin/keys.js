var debug = require('debug')('bin/keys')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('keys.txt')

module.exports = {
  name: 'keys',
  command: handleKeys,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'greater-than-equal',
      boolean: false,
      abbr: 'gte'
    },
    {
      name: 'greater-than',
      boolean: false,
      abbr: 'gt'
    },
    {
      name: 'less-than-equal',
      boolean: false,
      abbr: 'lte'
    },
    {
      name: 'less-than',
      boolean: false,
      abbr: 'lt'
    },
    {
      name: 'limit',
      boolean: false,
      abbr: 'l'
    }
  ]
}

function handleKeys (args) {
  debug('handleKeys', args)

  if (args.help) {
    return usage()
  }

  if (!args.dataset) abort(new Error('Error: Must specify dataset (-d)'))

  var limit = args.limit
  if (limit) {
    if (args.limit) args.limit = parseInt(limit, 10)
    if (isNaN(args.limit)) abort(new Error('invalid limit: ' + limit), args)
  }

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    var stream = db.createKeyStream(args)

    stream.on('data', function (key) {
      console.log(key)
    })

    stream.on('error', function (err) {
      if (err) abort(err, args, 'Error exporting data')
    })
  })
}
