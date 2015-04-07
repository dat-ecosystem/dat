var fs = require('fs')
var path = require('path')
var dat = require('dat-core')
var pump = require('pump')
var through = require('through2')
var uuid = require('cuid')
var debug = require('debug')('bin/add')
var parseInputStream = require('../lib/parse-input-stream.js')
var openDat = require('../lib/open-dat.js')

module.exports = {
  name: 'add',
  command: handleAdd,
  options: [
    {
      name: 'name',
      boolean: false,
      abbr: 'n'
    },
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    }
  ]
}

function handleAdd (args) {
  debug('handleAdd', args)
  
  if (args.help || args._.length === 0) {
    usage()
    abort()
  }
  
  openDat(args, function ready (err, dat) {
    if (err) abort(err)
    handleInputStream()
  })

  function handleInputStream () {
    var inputStream
    if (args._[0] === '-') inputStream = process.stdin
    else inputStream = fs.createReadStream(args._[0])
  
    var transform = through.obj(function (obj, enc, next) {
      var key = obj[args.key] || obj.key || uuid()
      next(null, {type: 'put', key: key, value: obj})
    })
  
    pump(inputStream, parseInputStream(), transform, db.createWriteStream(), function done (err) {
      if (err) abort(err, "Error adding data")
      console.error('Done adding data')
    })
  }
}

function usage () {
  console.log(fs.readFileSync(path.join(__dirname, '..', 'usage', 'add.txt')).toString())
}

function abort (err, message) {
  if (message) console.error(message)
  if (err) throw err
  process.exit(1)
}
