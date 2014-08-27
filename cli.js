#!/usr/bin/env node

var path = require('path')
var Dat = require('./')
var minimist = require('minimist')
var EOL = require('os').EOL
var url = require('url')
var stdout = require('stdout-stream')
var fs = require('fs')
var path = require('path')
var debug = require('debug')('dat.cli')

var defaultMessage = "Usage: dat <command> [<args>]" + EOL + EOL + "Enter 'dat help' for help"
var argv = minimist(process.argv.slice(2), {boolean: true})

var onerror = function(err) {
  console.error('Error: '+err.message)
  process.exit(2)
}

var first = argv._[0] || ''

var bin = {
  cat: './bin/cat',
  export: './bin/cat',
  import: './bin/import',
  init: './bin/init',
  help: './bin/help',
  version: './bin/version',
  pull: './bin/pull',
  push: './bin/push',
  clone: './bin/clone',
  listen: './bin/listen'
}

if (!bin.hasOwnProperty(first)) {
  console.error(defaultMessage)
  process.exit(1)
}

var dat = Dat(argv.path || '.', {init:false}, function(err) {
  if (err) return onerror(err)
  require(bin[first])(dat, argv, function(err) {
    if (err) return onerror(err)
  })
})