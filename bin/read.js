var pump = require('pump')
var debug = require('debug')('bin/read')
var Dat = require('../')
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
    return usage()
  }

  var dat = Dat(args)
  var key = args._[0]

  var opts = {
    dataset: args.d
  }

  debug(key, opts)

  pump(dat.createFileReadStream(key, opts), process.stdout, function done (err) {
    if (err) abort(err, args, 'dat: err in read')
  })
}
