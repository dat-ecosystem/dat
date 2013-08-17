#!/usr/bin/env node

var dat = require('./')(process.cwd())

var opts = require('optimist')
  .usage("Usage: $0 <command> [<args>]\n\nEnter 'dat help' for help")

parse(dat, opts)

function parse(dat, opts) {
  var args = opts.argv._
  var error = validate(dat, args)
  if (error) return process.stdout.write(error)
  var cmd = commands(opts)
  dat[cmd.command].call(dat, cmd.options, function(err) {
    if (err) return console.error('fatal', err.message)
  })
}

function validate(dat, args) {
  var args = opts.argv._
  if (args.length === 0) return opts.help()
  if (!dat[args[0]]) {
    return ['Invalid command: ' + args[0], opts.help()].join('\n')
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
