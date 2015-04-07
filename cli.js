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
    require(path.join(__dirname, 'bin', 'add.js'))
  ],
  defaults: [
    {
      name: 'path',
      boolean: false,
      default: process.cwd(),
      abbr: 'p'
    },
    {
      name: 'help',
      boolean: true,
      abbr: 'h'
    },
  ],
  none: noMatch
}

var route = subcommand(config)
route(process.argv.slice(2))

function noMatch (args) {
  console.error('dat:', args._[0], 'is not a valid command')
  process.exit(1)
}
