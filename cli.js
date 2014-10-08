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

var onerror = function(err) {
  console.error('Error: ' + err.message)
  process.exit(2)
}

// rules:
// a 1 part command and a 2 part command can't share the same first part
// e.g. if 'dat cat' exists you can't add 'dat cat dog'

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
  "blobs get": "./bin/blobs-get",
  "blobs put": "./bin/blobs-put",
  "rows get": "./bin/rows-get",
  "rows delete": "./bin/rows-delete"
}

var argv = minimist(process.argv.slice(2), {boolean: true})
var first = argv._[0] || ''
var second = argv._[1] || ''

var cmd = first
if (!bin.hasOwnProperty(first)) cmd = first + ' ' + second

var defaultMessage = "Usage: dat <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help"
var badMessage = ['Command not found: ' + cmd, '', defaultMessage].join(EOL)

if (!bin.hasOwnProperty(first) && !bin.hasOwnProperty(cmd)) {
  console.error(badMessage)
  process.exit(1)
}

var dir = (first === 'clone' && (argv._[2] || toFolder(argv._[1]))) || argv.path || '.' // leaky
var initing = (first === 'init' || first === 'clone')

var dat = Dat(dir, {init: false}, function(err) {
  if (err) return onerror(err)

  var execCommand = function(err) {
    if (err) return onerror(err)
    require(bin[cmd])(dat, argv, function(err) {
      if (err) return onerror(err)
      setImmediate(close)
    })
  }

  if (!dat.db && !initing) return onerror(new Error('There is no dat here'))
  if (first !== 'listen' && !dat.rpcClient) return dat.listen(argv.port, argv, execCommand)
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