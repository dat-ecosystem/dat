#!/usr/bin/env node
var fs = require('fs')
var path = require('path')
var Dat = require('dat-core')
var subcommand = require('subcommand')

var toplevelOpts = [
  {name: 'version', alias: 'v', boolean: false}
]

var commands = [
  {name: "", options: toplevelOpts, command: onNoSubcommand},
  require(path.join(__dirname, 'bin', 'init.js'))
]

var route = subcommand(commands)
var handled = route(process.argv.slice(2))
if (!handled) {
  console.error('dat: not a valid command')
}

function onNoSubcommand (args) {
  if (args.version) return console.log(require('./package.json').version)
  
  console.log(fs.readFileSync('usage.txt').toString())
}