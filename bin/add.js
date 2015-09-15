var path = require('path')
var pump = require('pump')
var debug = require('debug')('bin/add')

var usage = require('../lib/util/usage.js')('add.txt')
var abort = require('../lib/util/abort.js')
var progress = require('../lib/util/progress.js')
var createFileStream = require('../lib/util/create-file-stream.js')
var openDat = require('../lib/util/open-dat.js')

module.exports = {
  name: 'add',
  command: handleAdd,
  options: [
    {
      name: 'dataset',
      boolean: false,
      abbr: 'd'
    },
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    },
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    },
    {
      name: 'key',
      boolean: false,
      abbr: 'k'
    }
  ]
}

function handleAdd (args) {
  debug('handleAdd', args)
  if (args.help || args._.length === 0) return usage()

  var location = path.normalize(args._[0])
  var stream = args._[1]
  var key = args.key
  if (!key) key = path.isAbsolute(location) ? path.basename(location) : location

  openDat(args, function (err, db) {
    if (err) abort(err, args)
    if (stream === '-') doWrite(process.stdin, db)
    else {
      createFileStream(location, function (err, inputStream) {
        if (err) abort(err, args)
        doWrite(inputStream, db)
      })
    }
  })

  function doWrite (inputStream, db) {
    var writer = db.createFileWriteStream(key, {message: args.message})
    progress(writer, {bytes: true, verb: 'Storing ' + key})
    pump(inputStream, writer, function done (err) {
      if (err) abort(err, args, 'Error: Write failed to ' + key)

      if (args.json) {
        var output = {
          version: db.head
        }
        console.log(JSON.stringify(output))
      } else console.error('Stored ' + key + ' successfully. \nCurrent version is now: ' + db.head)

      db.close()
    })
  }
}
