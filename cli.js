#!/usr/bin/env node

var path = require('path')
var Dat = require('./')
var minimist = require('minimist')
var EOL = require('os').EOL
var url = require('url')
var stdout = require('stdout-stream')
var fs = require('fs')
var path = require('path')
var rimraf = require('rimraf')
var debug = require('debug')('dat.cli')
var exit = require('exit')
var cliclopts = require('cliclopts')
var leven = require('leven')

var onerror = function(err) {
  console.error('Error: ' + err.message)
  exit(2)
}

var bin = {
  "cat": './bin/cat',
  "export": './bin/cat',
  "import": './bin/import',
  "init": './bin/init',
  "help": './bin/help',
  "version": './bin/version',
  "pull": './bin/pull',
  "push": './bin/push',
  "clean": './bin/clean',
  "clone": './bin/clone',
  "serve": './bin/listen',
  "listen": './bin/listen',
  "blobs": './bin/blobs',
  "rows": "./bin/rows"
}
var argv = minimist(process.argv.slice(2))
var cmd = argv._[0]

if (!bin.hasOwnProperty(cmd)) {
  if(cmd) {
    console.error('Command not found: ' + cmd)
    var candidates = Object.keys(bin)
      .filter(function (key) {
        return leven(key, cmd) < 3
      })
      .sort(function (a,b) {
        return leven(a, cmd) - leven(b, cmd)
      })
      .slice(0, 3)
    if(candidates.length > 0) {
      console.error(EOL + 'Did you mean:')
      candidates.forEach(function (candidate) {
        console.log('  ', candidate)
      })
    }
  } else {
    console.error("Usage: dat <command> [<args>]" + EOL)
    console.error('where <command> is one of:')
    Object.keys(bin).forEach(function (key) {
      console.error('  ' + key)
      if(argv.l || argv.long) {
        var cliModule = require(bin[key])
        cliclopts(cliModule.options).print(process.stderr)
        console.error()
      }
    })
  }
  
  console.error(EOL + "Enter 'dat <command> -h' for usage information")
  console.error("For an introduction to dat see 'dat help'")
  exit(1)
}

var cmdModule = require(bin[cmd])

// look for subcommands
if(cmdModule.hasOwnProperty('commands')) {
  var second = argv._[1]
  if(cmdModule.commands.hasOwnProperty(second))
    cmdModule = cmdModule.commands[second]
}

var clopts = cliclopts(cmdModule.options)

// parse argv again with minimist options
argv = minimist(process.argv.slice(2), {
  boolean: clopts.boolean(),
  alias: clopts.alias(),
  default: clopts.default()
})

var dir = (cmd === 'clone' && (argv._[2] || toFolder(argv._[1]))) || argv.path || '.' // leaky

var noDat = cmdModule.noDat

if(argv.h || argv.help) {
  var usage = cmdModule.usage
  if(usage) { // if it doesn't export usage just continue
    if(typeof usage == 'function') usage = usage(argv)
    console.log('Usage:', usage, EOL)
    clopts.print()
    exit()
  }
}

var dat = Dat(dir, {init: false}, function(err) {
  if (err) return onerror(err)

  var execCommand = function(err) {
    if (err) return onerror(err)
    cmdModule(dat, argv, function(err) {
      if (err) {
        if (cmd === 'init') {
          console.error(err.message)
          exit(0)
        }
        return onerror(err)
      }
      setImmediate(close)
    })
  }

  if (!dat.db && !noDat) return onerror(new Error('There is no dat here'))
  if (cmd !== 'listen' && !dat.rpcClient) return dat.listen(argv.port, argv, execCommand)
  execCommand()
})

function toFolder(dir) {
  if (!dir) return dir
  return dir.replace(/^.*\/\//, '').replace(/[\/:].*$/, '')
}

function close() {
  // if _server exists it means dat is the rpc server
  if (dat._server) {
    // since the server process can't exit yet we must manually close stdout
    stdout.end()

    // if there aren't any active connections then we can close the server
    if (dat._connections.sockets.length === 0) dat.close()

    // otherwise wait for the current connections to close
    dat._connections.on('idle', function() {
      debug('dat close due to idle')
      dat.close()
    })

  } else {
    dat.close()
  }
}