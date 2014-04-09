#!/usr/bin/env node

var path = require('path')
var Dat = require(__dirname)
var cli = require(path.join(__dirname, 'lib', 'parse-cli'))
var optimist = require('optimist')
var EOL = require('os').EOL

var opts = optimist.usage("Usage: $0 <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help")

var datCommand = cli.command(opts)

var datOpts = { init: false }

if (datCommand.command === 'backend' || datCommand.command === 'clone') {
  datOpts.storage = false
}

var dat = Dat(process.cwd(), datOpts, function ready(err) {
  if (err) return console.error(err)
  cli.exec(dat, opts, datCommand)
})
