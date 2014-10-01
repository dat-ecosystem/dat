var tty = require('tty')
var fs = require('fs')
var log = require('../lib/progress-log')
var eos = require('end-of-stream')
var through = require('through2')
var pump = require('pump')
var EOL = require('os').EOL

var isTTY = tty.isatty(0)

module.exports = function(dat, opts, cb) {
  var filename = opts._[1]
  var input = null

  if (filename === '-' || (!filename && !isTTY)) { // TODO: reevaluate the !isTTY thing
    if (!opts.quiet) console.log('No import file specified, using STDIN as input\n')
    input = process.stdin
  } else if (filename) {
    input = fs.createReadStream(filename)
  }

  if (!input) return cb(new Error('You must specify an input file'))

  var format = opts.format || opts.f
  if (format) opts[format] = true

  var writer = dat.createWriteStream(opts)

  if (opts.results) writer.pipe(resultPrinter())
  else if (!opts.quiet) log(writer, 'Parsed', 'Done')

  pump(input, writer, cb)
}

function resultPrinter() { // TODO: ask @maxogden what the result printer is for
  var results = through.obj(onResultWrite)
  function onResultWrite (obj, enc, next) {
    process.stdout.write(JSON.stringify(obj) + EOL)
    next()
  }
  return results
}