var pump = require('pump')
var fs = require('fs')
var debug = require('debug')('bin/write')
var openDat = require('../lib/open-dat.js')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('write.txt')

module.exports = {
  name: 'write',
  command: handleWrite,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'name',
      boolean: false,
      abbr: 'n'
    }
  ]
}

function handleWrite (args) {
  debug('handleWrite', args)

  if (args.help || !args.dataset || args._.length === 0) {
    usage()
    abort()
  }

  openDat(args, function ready (err, db) {
    if (err) abort(err)
    handleInputStream(db)
  })

  function handleInputStream (db) {
    var path = args._[0]
    var stream = args._[1]
    var key = args.n || path

    var inputStream
    if (stream === '-') {
      inputStream = process.stdin
    } else {
      if (!fs.existsSync(path)) {
        usage()
        abort(new Error('File at ' + path + ' does not exist'))
      }
      inputStream = fs.createReadStream(path)
    }

    var opts = {
      dataset: args.d
    }

    pump(inputStream, db.createFileWriteStream(key, opts), function done (err) {
      if (err) abort(err, 'dat: err in write')

      if (args.json) {
        var output = {
          version: db.head
        }
        console.log(JSON.stringify(output))
      } else console.error('Done writing binary data.')

    })
  }
}
