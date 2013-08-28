#!/usr/bin/env node

var path = require('path')
var dat = require(__dirname)(process.cwd())
var cli = require(path.join(__dirname, 'lib', 'parse-cli'))
var optimist = require('optimist')
var EOL = require('os').EOL

var opts = optimist.usage("Usage: $0 <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help")
cli.parse(dat, opts)
