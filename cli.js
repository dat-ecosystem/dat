#!/usr/bin/env node

var Dat = require('dat-core')
var meow = require('meow')

var cliclopts = require('cliclopts')

var options = [
  {
    name: 'verbose',
    abbr: 'v',
    alias: ['loud'],
    boolean: true,
    help: 'be verbose'
  },
  {
    name: 'path',
    abbr: 'p',
    default: 'dat.json',
    help: 'path to file'
  }
]

var clopts = cliclopts(options)

var cli = meow({
  help: 'Usage\n' + clopts.usage()
}, clopts.options())
