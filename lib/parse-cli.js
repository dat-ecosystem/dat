var EOL = require('os').EOL

module.exports = {
  parse: parse,
  validate: validate,
  commands: commands
}

function parse(dat, opts) {
  var error = validate(dat, opts)
  if (error) return process.stdout.write(error)
  var cmd = commands(opts)
  dat[cmd.command].call(dat, cmd.options, function(err, message) {
    if (err) return console.error('fatal', err.message)
    if (opts.argv.verbose) process.stdout.write(message.toString() + EOL)
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
  args.map(function(arg) { options[arg] = true })
  var skip = ['$0', '_']
  Object.keys(opts.argv).map(function(arg) {
    if (skip.indexOf(arg) > -1) return
    options[arg] = opts.argv[arg]
  })
  return {command: cmd, options: options}
}
