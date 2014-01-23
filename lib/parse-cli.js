var EOL = require('os').EOL
var through = require('through')
var fs = require('fs')
var path = require('path')

module.exports = {
  parse: parse,
  validate: validate,
  commands: commands
}

function initDat(dat, opts, cb) {
  dat._ensureExists(opts, function exists(err) {
    if (err) return cb(err)
    var store = dat._storage(opts, function(err, seq) { // so .store is ready
      if (err) return cb(err)
      cb()
    })
  })
}

function parse(dat, opts) {
  var inputStream = getInputStream(opts)
  if (inputStream) {
    initDat(dat, opts, function(err) {
      if (err) return process.stdout.write(err + EOL)
      var writer = dat.createWriteStream(opts)
      if (!writer) return
      inputStream.pipe(writer)
      if (opts.argv.quiet) return
      writer.pipe(resultPrinter())
    })
    return
  }
  var error = validate(dat, opts)
  if (error) return process.stdout.write(error)
  var cmd = commands(opts)
  dat[cmd.command].call(dat, cmd.options, function(err, message) {
    if (err) return console.error('fatal', err.message)
    if (typeof message === 'object') message = JSON.stringify(message)
    if (!opts.argv.quiet && message) process.stdout.write(message.toString() + EOL)
    if (cmd.command !== 'serve') dat.close()
  })    
}

function getInputStream(opts) {
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

function commands(opts) {
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
  var results = through(onResultWrite)
  function onResultWrite (obj) {
    if (obj.success) process.stdout.write(JSON.stringify(obj.row) + EOL)
    else process.stderr.write(JSON.stringify(obj) + EOL)
  } 
  return results
}