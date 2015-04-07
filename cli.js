#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var Dat = require('dat-core')
var subcommand = require('subcommand')

var commands = [
  require(path.join(__dirname, 'bin', 'default.js')),
  require(path.join(__dirname, 'bin', 'init.js'))
]

var route = subcommand(commands)
var handled = route(process.argv.slice(2))
if (!handled) {
  console.error('dat: not a valid command')
}
