#!/usr/bin/env node
var subcommand = require('subcommand')

var config = {
  root: require('./bin/root.js'),
  commands: [
    require('./bin/init.js'),
    require('./bin/cat.js'),
    require('./bin/add.js'),
    require('./bin/push.js'),
    require('./bin/checkout.js'),
    require('./bin/pull.js'),
    require('./bin/replicate.js'),
    require('./bin/export.js'),
    require('./bin/diff.js'),
    require('./bin/heads.js'),
    require('./bin/merge.js')
  ],
  defaults: require('./bin/defaults.js'),
  none: noMatch
}

var route = subcommand(config)
route(process.argv.slice(2))

function noMatch (args) {
  console.error('dat:', args._[0], 'is not a valid command')
  process.exit(1)
}
