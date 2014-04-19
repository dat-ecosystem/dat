var EOL = require('os').EOL
var through = require('through2')
var fs = require('fs')
var path = require('path')
var tty = require('tty')
var debug = require('debug')('dat.parseCLI')

module.exports = {
  command: command,
  writeInputStream: writeInputStream,
  getInputStream: getInputStream
}

function writeInputStream(inputStream, dat, opts) {
  var writer = dat.createWriteStream(opts)
  inputStream.pipe(writer)
  if (!opts.argv.quiet) writer.pipe(resultPrinter())
  writer.on('end', function() {
    dat.close()
  })
  writer.on('error', function(e) {
    // TODO prettier error printing
    console.error('write stream error', e)
    dat.close()
  })
}

function getInputStream(opts, cmd) {
  if (opts.argv) opts = opts.argv
  var first = opts._[0] || ''
  var second = opts._[1] || ''
  var isTTY = tty.isatty(0)
  
  debug('getInputStream', 'isTTY=' + isTTY, 'opts=' + JSON.stringify(opts))
  
  // cat foo.txt | dat input, cat foo.txt | dat input -
  if ((!isTTY && second === '') || second === '-') {
    return process.stdin
  }
  
  // cat foo.txt | dat input - w/o relying on isTTY
  if (first === 'import' && second === '') return process.stdin
  
  if (!second) return
  
  if (opts.csv 
    || opts.f === 'csv'
    || opts.json
    || opts.f === 'json')
      return fs.createReadStream(second)
}

function command(opts) {
  var args = opts.argv._
  var cmd = args.shift()
  var options = {}
  var idx = 0
  args.map(function(arg) {
    options[idx] = arg
    idx++
  })
  var skip = ['$0', '_']
  Object.keys(opts.argv).map(function(arg) {
    if (skip.indexOf(arg) > -1) return
    options[arg] = opts.argv[arg]
  })
  return {command: cmd, options: options}
}

function resultPrinter() {
  var results = through.obj(onResultWrite)
  function onResultWrite (obj, enc, next) {
    if (obj.success) process.stdout.write(JSON.stringify(obj.row) + EOL)
    else process.stderr.write(JSON.stringify(obj) + EOL)
    next()
  } 
  return results
}
