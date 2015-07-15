var pump = require('pump')
var fs = require('fs')
var basename = require('path').basename
var debug = require('debug')('bin/write')
var openDat = require('../lib/util/open-dat.js')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('write.txt')
var progress = require('../lib/util/progress.js')

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
      name: 'key',
      boolean: false,
      abbr: 'k'
    },
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    }
  ]
}

function handleWrite (args) {
  debug('handleWrite', args)

  if (args.help || args._.length === 0) {
    return usage()
  }

  openDat(args, function (err, db) {
    if (err) abort(err, args)
    var path = args._[0]
    var stream = args._[1]
    var key = args.key || basename(path)

    var inputStream
    if (stream === '-') {
      inputStream = process.stdin
    } else {
      if (!fs.existsSync(path)) {
        abort(new Error('Error: File at ' + path + ' does not exist'), args)
      }
      inputStream = fs.createReadStream(path)
    }

    var opts = {
      dataset: 'files',
      message: args.message
    }

    var writer = db.createFileWriteStream(key, opts)
    progress(writer, {bytes: true, verb: 'Storing ' + key})
    pump(inputStream, writer, function done (err) {
      if (err) abort(err, args, 'Error: Write failed')

      if (args.json) {
        var output = {
          version: db.head
        }
        console.log(JSON.stringify(output))
      } else console.error('Stored ' + key + ' successfully. \nCurrent version is now: ' + db.head)

    })
  })
}
