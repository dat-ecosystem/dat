var stdout = require('stdout-stream')
var multistream = require('multistream')
var eos = require('end-of-stream')
var through = require('through2')
var pump = require('pump')
var formatData = require('format-data')
var EOL = require('os').EOL

module.exports = cat

cat.usage = [
 'dat cat',
 'stream the most recent of all rows'
 ].join(EOL)
 
 cat.options = [
   {
     name: 'format',
     abbr: 'f',
     help: 'specify output format'
   },
  {
    name: 'csv',
    help: 'output as csv',
    boolean: true,
  },
  {
    name: 'json',
    help: 'output as json',
    boolean: true
  },
  {
    name: 'ndjson',
    help: 'output as newline delimited json',
    boolean: true
  },
  {
    name: 'sse',
    help: 'output as server-sent events',
    boolean: true
  },
  {
    name: 'live',
    help: 'stream live changes (does not support json output)',
    boolean: true
  }
 ]

function cat(dat, opts, cb) {
  if (!opts) opts = {}
  if(!opts.format) {
    if(opts.csv) opts.format = 'csv'
    if(opts.json) opts.format = 'json'
    if(opts.ndjson) opts.format = 'ndjson'
    if(opts.sse) opts.format = 'sse'
  }
  var format = opts.format || 'ndjson'
  opts.format = 'objectMode'
  var readStream = dat.createReadStream(opts)

  if (opts.live) {
    if(['ndjson', 'csv', 'sse'].indexOf(format) === -1) {
      format = 'ndjson'
    }
    
    var changes = dat.createChangesReadStream({
      since: dat.storage.change,
      data: true,
      decode: true,
      live: true
    })

    var selectValues = through.obj(function(data, enc, cb) {
      // Somehow data.value has no valid version key
      var row = data.value
      data.value.version = data.to
      cb(null, data.value)
    })

    readStream = multistream.obj([readStream, pump(changes, selectValues)])
  }

  opts.format = format
  var formatter = formatData(opts)
  readStream.pipe(formatter).pipe(stdout)
  eos(formatter, cb)
}