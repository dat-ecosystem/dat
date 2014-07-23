#!/usr/bin/env node

var path = require('path')
var Dat = require('./')
var cli = require('./lib/parse-cli.js')
var minimist = require('minimist')
var EOL = require('os').EOL
var url = require('url')
var stdout = require('stdout-stream')
var fs = require('fs')
var debug = require('debug')('dat.cli')

var argv = minimist(process.argv.slice(2))
var defaultMessage = "Usage: dat <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help"
var datCommand = cli.command(argv)

stdout.on('error', function(err) {
  if (err.code !== 'EPIPE') throw err
})

var first = argv._[0] || ''
if (first === 'import' || !first) {
  var inputStream = cli.getInputStream(argv, datCommand)
} else {
  var inputStream = false
}

var datOpts = { init: datCommand.command !== 'init' }

if (datCommand.options.prompt === undefined) {
  datCommand.options.prompt = datCommand.tty
}
if (argv.transform) {
  datOpts.transformations = {}
  datOpts.transformations[first === 'import' ? 'put' : 'get'] = argv.transform
}

var datPath = process.cwd()

if (datCommand.command === 'clone') {
  var remote = argv._[1]
  if (!remote) {
    console.error('Must specify remote to clone from')
    process.exit(1)
  }
  var remote = url.parse(Dat.prototype.normalizeURL(remote))
  var customPath = argv._[2] || argv.dir
  if (customPath) datPath = customPath
  else datPath = path.join(datPath, remote.hostname)
}

var dat = Dat(datPath, datOpts, function ready(err) {
  if (err) {
    console.error(err)
    dat.close()
    return
  }
  
  if (datCommand.command === 'clone' && dat.storage.change > 0) {
    console.error(new Error('Cannot clone into existing dat repo'))
    dat.close()
    return
  }
  
  if (datCommand.command === 'init') {
    execCommand()
  } else {
    // start the server
    var listenArgs = {}
    if (datCommand.command === 'listen') listenArgs = datCommand.options
    dat.listen(listenArgs, function(err, port) {
      if (err) console.error('could not listen')
      execCommand()
    })
  }
  
  function execCommand() {
    if (inputStream) {
      return cli.writeInputStream(inputStream, dat, argv)
    }

    if (!datCommand || !datCommand.command) {
      dat.close()
      return process.stderr.write(defaultMessage + EOL)
    }
  
    if (!cliCommands[datCommand.command]) {
      dat.close()
      return process.stderr.write(['Command not found: ' + datCommand.command, '', defaultMessage].join(EOL))
    }
    
    cliCommands[datCommand.command].call(dat, datCommand.options, function(err, message) {
      if (err) {
        dat.close()
        return console.error(err.message)
      }
      if (typeof message === 'object') message = JSON.stringify(message)
      if (!argv.quiet && message) stdout.write(message.toString() + EOL)
      var persist = ['serve', 'listen']
      if (persist.indexOf(datCommand.command) === -1) close()
    })
  }
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
  config: dat.config,
  serve: dat.listen,
  listen: dat.listen,
  version: dat.versionCmd
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
