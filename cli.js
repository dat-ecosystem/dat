#!/usr/bin/env node

var path = require('path')
var Dat = require(__dirname)
var cli = require(path.join(__dirname, 'lib', 'parse-cli'))
var optimist = require('optimist')
var EOL = require('os').EOL
var url = require('url')
var stdout = require('stdout-stream')
var fs = require('fs')
var debug = require('debug')('dat.cli')

var opts = optimist.usage("Usage: $0 <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help")
var datCommand = cli.command(opts)

var first = opts.argv._[0] || ''
if (first === 'import' || !first) {
  debug('import', opts.argv._[1])
  var inputStream = cli.getInputStream(opts, datCommand)
} else {
  var inputStream = false
}

var datOpts = { init: !!inputStream }

if (datCommand.command === 'backend' || datCommand.command === 'clone') {
  datOpts.storage = false
}

var datPath = process.cwd()

if (datCommand.command === 'clone') {
  var remote = url.parse(Dat.prototype.normalizeURL(opts.argv._[1]))
  var customPath = opts.argv._[2] || opts.argv.dir
  if (customPath) datPath = customPath
  else datPath = path.join(datPath, remote.hostname)
}

var dat = Dat(datPath, datOpts, function ready(err) {
  if (err) {
    console.error(err)
    dat.close()
    return
  } 
  
  if (inputStream) {
    return cli.writeInputStream(inputStream, dat, opts.argv)
  }
  
  if (opts.argv._.length === 0) {
    dat.close()
    return process.stderr.write(opts.help())
  }
  
  if (!cliCommands[datCommand.command]) {
    dat.close()
    return process.stderr.write(['Command not found: ' + datCommand.command, '', opts.help()].join(EOL))
  }
  
  cliCommands[datCommand.command].call(dat, datCommand.options, function(err, message) {
    if (err) {
      dat.close()
      return console.error(err.message)
    }
    if (typeof message === 'object') message = JSON.stringify(message)
    if (!opts.argv.quiet && message) stdout.write(message.toString() + EOL)
    if (datCommand.command !== 'serve') close()
  })
})

// CLI commands whitelist
var cliCommands = {
  init: dat.init,
  cat: dat.cat,
  "export": dat.cat,
  dump: dat.dump,
  help: dat.help,
  pull: dat.pull,
  push: dat.push,
  clone: dat.clone,
  backend: dat.backend,
  serve: dat.serve,
  config: dat.config
}

function close() {
  // if _server exists it means dat is the rpc server
  if (dat._server) {
    // since the server process can't exit yet we must manually close stdout
    stdout.end()
    
    // if there aren't any active connections then we can close the server
    if (dat.connections.sockets.length === 0) dat.close()
    
    // otherwise wait for the current connections to close
    dat.connections.on('idle', function() {
      debug('dat close due to idle')
      dat.close()
    })
    
  } else {
    dat.close()
  }
}
