var fs = require('fs')
var path = require('path')
var dat = require('dat-core')
var pump = require('pump')
var through = require('through2')
var uuid = require('cuid')
var debug = require('debug')('bin/add')
var parseInputStream = require('../lib/parse-input-stream.js')

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
    },
    {
      name: 'path',
      boolean: false,
      default: process.cwd(),
      abbr: 'p'
    }
  ]
}

function handleAdd (args) {
  debug('handleAdd', args)
  
  if (args.help || args.h || args._.length === 0) {
    usage()
    process.exit(1)
  }
  
  var db = dat(args.path, {valueEncoding: 'json'})
  db.on('error', notExists)

  var inputStream
  if (args._[0] === '-') inputStream = process.stdin
  else inputStream = fs.createReadStream(args._[0])
  
  var transform = through.obj(function (obj, enc, next) {
    // console.log(obj, args)
    var key = obj[args.key] || obj.key || uuid()
    next(null, {type: 'put', key: key, value: obj})
  })
  
  pump(inputStream, parseInputStream(), transform, db.createWriteStream(), function done (err) {
    if (err) {
      console.error("Error adding data", err)
      process.exit(1)
    }

    console.log('Done adding data')
  })

  
  function notExists (err) {
    if (err.message === 'No dat here') console.error('This is not a dat repository, you need to dat init first')
    else console.error('Error reading dat', err.message)
    process.exit(1)
  }
  
  function usage () {
    console.log(fs.readFileSync(path.join(__dirname, '..', 'usage', 'add.txt')).toString())
  }
}