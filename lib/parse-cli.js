var EOL = require('os').EOL
var split = require('split')
var through = require('through')

module.exports = {
  parse: parse,
  validate: validate,
  commands: commands
}

function parse(dat, opts) {
  if (!process.stdin.isTTY || opts.argv._[0] === '-') return writeJSON(dat, opts)
  var error = validate(dat, opts)
  if (error) return process.stdout.write(error)
  var cmd = commands(opts)
  dat[cmd.command].call(dat, cmd.options, function(err, message) {
    if (err) return console.error('fatal', err.message)
    if (typeof message === 'object') message = JSON.stringify(message)
    if (!opts.argv.quiet && message) process.stdout.write(message.toString() + EOL)
  })
}

function writeJSON(dat, opts) {
  dat._ensureExists(opts, function exists(err) {
    if (!opts.argv.quiet && err) return process.stdout.write(err + EOL)
    var splitter = split(function(row) {
      if (row) return JSON.parse(row)
    })
    splitter.on('error', function(err) {
      if (!opts.argv.quiet && err) return process.stdout.write('Error! ' + err.message.toString() + EOL)
    })
    process.stdin
      .pipe(splitter)
      .pipe(dat.createWriteStream(opts))
      .pipe(through(function(obj) { process.stdout.write(JSON.stringify(obj) + EOL) }))
  })
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
