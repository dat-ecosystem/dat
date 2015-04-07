var dat = require('dat-core')
var pump = require('pump')
var ndjson = require('ndjson')

module.exports = {
  name: 'cat',
  command: handleCat,
  options: [
    {
      name: 'format',
      boolean: false,
      abbr: 'f'
    },
    {
      name: 'greater-than',
      boolean: false,
      abbr: 'gt'
    },
    {
      name: 'less-than',
      boolean: false,
      abbr: 'lt'
    },
    {
      name: 'path',
      boolean: false,
      default: process.cwd(),
      abbr: 'p'
    }
  ]
}

function handleCat (args) {
  var db = dat(args.path, {valueEncoding: 'json'})
  db.on('error', notExists)
  
  var readStream = db.createReadStream({gt: args.gt, lt: args.lt})
  
  pump(readStream, ndjson.serialize(), process.stdout, function done (err) {
    if (err) {
      console.error('Dat cat error', err)
      process.exit(1)
    }
  })
}

function notExists (err) {
  if (err.message === 'No dat here') console.error('This is not a dat repository, you need to dat init first')
  else console.error('Error reading dat', err.message)
  process.exit(1)
}
