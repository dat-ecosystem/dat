#!/usr/bin/env node

var path = require('path')
var Dat = require(__dirname)
var cli = require(path.join(__dirname, 'lib', 'parse-cli'))
var optimist = require('optimist')
var EOL = require('os').EOL

var opts = optimist.usage("Usage: $0 <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help")
var datCommand = cli.command(opts)
var inputStream = cli.getInputStream(opts, datCommand)
var datOpts = { init: !!inputStream }

if (datCommand.command === 'backend' || datCommand.command === 'clone') {
  datOpts.storage = false
}

var datPath = process.cwd()

if (datCommand.command === 'clone') {
  var customPath = opts.argv._[2] || opts.argv.dir
  if (customPath) datPath = customPath
  else datPath = path.join(datPath, opts.argv._[1])
}

var dat = Dat(datPath, datOpts, function ready(err) {
  if (err) return console.error(err)
  
  if (inputStream) {
    return cli.writeInputStream(inputStream, dat, opts)
  }
  
  var validationError = cli.validate(dat, opts)
  
  if (validationError) {
    process.stdout.write(validationError)
    dat.close()
    return
  }
  
  cliCommands[datCommand.command].call(dat, datCommand.options, function(err, message) {
    if (err) {
      console.error(err.message)
      dat.close()
      return
    }
    if (typeof message === 'object') message = JSON.stringify(message)
    if (!opts.argv.quiet && message) process.stdout.write(message.toString() + EOL)
    if (datCommand.command !== 'serve') dat.close()
  })
})

// CLI commands whitelist
var cliCommands = {
  init: dat.init,
  cat: dat.cat,
  dump: dat.dump,
  pull: dat.pull,
  push: dat.push,
  clone: dat.clone,
  backend: dat.backend,
  serve: dat.serve
}
