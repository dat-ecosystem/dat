#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var Dat = require('dat-core')
var subcommand = require('subcommand')

var config = {
  root: require(path.join(__dirname, 'bin', 'root.js')),
  commands: [
    require(path.join(__dirname, 'bin', 'init.js')),
    require(path.join(__dirname, 'bin', 'cat.js')),
    require(path.join(__dirname, 'bin', 'add.js')),
    require(path.join(__dirname, 'bin', 'push.js')),
    require(path.join(__dirname, 'bin', 'pull.js')),
    require(path.join(__dirname, 'bin', 'receive-replication.js'))
  ],
  defaults: require(path.join(__dirname, 'bin', 'defaults.js')),
  none: noMatch
}

var route = subcommand(config)
route(process.argv.slice(2))

function noMatch (args) {
  console.error('dat:', args._[0], 'is not a valid command')
  process.exit(1)
}
