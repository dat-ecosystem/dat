var tty = require('tty')
var fs = require('fs')
var log = require('../lib/progress-log')
var eos = require('end-of-stream')
var through = require('through2')
var pump = require('pump')
var EOL = require('os').EOL
var path = require('path')

var inIsTTY  = tty.isatty(0)

module.exports = importCmd

importCmd.usage = ['dat import [<file>]',
  'import tabular data into dat', '',
  'also allows piping, e.g. cat file.json | dat import --json'
].join(EOL)

function importCmd(dat, opts, cb) {
  var filename = opts._[1]
  var input = null

  var quiet = opts.quiet || opts.q
  
  if (filename === '-' || (!filename && !inIsTTY) || opts.stdin) {
    if (!quiet) console.error('No import file specified, using STDIN as input')
    input = process.stdin
  } else if (filename) {
    if (!(opts.json || opts.csv || opts.tsv)) {
      var ending = path.extname(filename)
      if (ending === '.json') {
          opts.json = true;
      } else if (ending === '.tsv') {
          opts.tsv = true;
          opts.separator = '\t';  // use tab separator
      } else if (ending === '.csv') {
          opts.csv = true;
      }
    }
    input = fs.createReadStream(filename)
  }

  if (!input) return cb(new Error('You must specify an input file'))

  var format = opts.format || opts.f
  if (format) opts[format] = true

  var writer = dat.createWriteStream(opts)

  var showImport = !quiet

  if (opts.results) writer.pipe(resultPrinter())
  else if (showImport) var logger = log(writer, 'Parsed', 'Done')

  writer.on('detect', function (detected) {
    var detectInfo = 'Parsing detected format ' + detected.format

    if (detected.format === 'csv')
      detectInfo += ' with separator "' + detected.separator + '"'
    else if (detected.format === 'json')
      detectInfo += ' in ' + detected.style + ' style'

    if (opts.results) console.error(detectInfo)
    else if (logger) logger.log(detectInfo)
  })

  pump(input, writer, cb)
}

function resultPrinter() { // TODO: ask @maxogden what the result printer is for
  var results = through.obj(onResultWrite)
  function onResultWrite(obj, enc, next) {
    process.stdout.write(JSON.stringify(obj) + EOL)
    next()
  }
  return results
}
