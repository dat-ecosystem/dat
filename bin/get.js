var debug = require('debug')('bin/get')

var datRead = require('../bin/read.js').command
var datExport = require('../bin/export.js').command

var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('get.txt')

module.exports = {
  name: 'get',
  command: handleGet,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'key',
      boolean: false,
      abbr: 'k'
    }
  ]
}

function handleGet (args) {
  debug('handleGet', args)
  if (args.help || args._.length === 0) {
    return usage()
  }

  if (!args.dataset) return datRead(args)
  if (!args.key) return datExport(args)

  openDat(args, function ready (err, db) {
    if (err) abort(err, args)
    var key = args._[0].toString()

    debug(key, args)
    db.get(key, args, function (err, value) {
      if (err) {
        var msg = 'Error: Could not find key ' + key + ' in dataset ' + args.dataset + '.'
        abort(err, args, msg)
      }
      process.stdout.write(JSON.stringify(value))
      db.close()
    })
  })
}
