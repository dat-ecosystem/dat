var EOL = require('os').EOL
var through = require('through2')
var fs = require('fs')
var path = require('path')

module.exports = {
  validate: validate,
  command: command,
  writeInputStream: writeInputStream,
  getInputStream: getInputStream
}

function writeInputStream(inputStream, dat, opts) {
  var writer = dat.createWriteStream(opts)
  if (!writer) return
  inputStream.pipe(writer)
  if (opts.argv.quiet) return
  writer.pipe(resultPrinter())
  writer.on('end', function() {
    dat.close()
  })
  writer.on('error', function(e) {
    // TODO prettier error printing
    console.error(e)
    dat.close()
  })
}

function getInputStream(opts, cmd) {
  if (cmd.command === 'cat') return
  if (opts.argv) opts = opts.argv
  if (!process.stdin.isTTY || opts._[0] === '-') {
    return process.stdin
  }
  
  var input
  if (opts._) input = opts._[0]
  
  if (!input) return
  
  if (opts.csv 
    || opts.f === 'csv'
    || opts.json
    || opts.f === 'json')
      return fs.createReadStream(input)
}

function validate(dat, opts) {
  var args = opts.argv._
  if (args.length === 0) return opts.help()
  if (!dat[args[0]]) {
    return ['Invalid command: ' + args[0], '', opts.help()].join(EOL)
  }
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
  } 
  return results
}
