#!/usr/bin/env node
var path = require('path')
var Dat = require('dat-core')
var subcommand = require('subcommand')

var bins = [
  require(path.join(__dirname, 'bin', 'init.js'))
]

var commands = subcommand(bins)
var handled = commands(process.argv.slice(2))
if (!handled) {
  console.error('Command not found')
}