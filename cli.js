#!/usr/bin/env node

var path = require('path')
var Dat = require(__dirname)
var cli = require(path.join(__dirname, 'lib', 'parse-cli'))
var optimist = require('optimist')
var EOL = require('os').EOL

var opts = optimist.usage("Usage: $0 <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help")

var dat = Dat(process.cwd(), { init: false }, function ready(err) {
  if (err) return console.error(err)
  cli.parse(dat, opts)
})
