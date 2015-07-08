#!/usr/bin/env node
var subcommand = require('subcommand')

var config = {
  root: require('./bin/root.js'),
  commands: [
    require('./bin/init.js'),
    require('./bin/import.js'),
    require('./bin/datasets.js'),
    require('./bin/destroy.js'),
    require('./bin/clone.js'),
    require('./bin/log.js'),
    require('./bin/push.js'),
    require('./bin/checkout.js'),
    require('./bin/pull.js'),
    require('./bin/get.js'),
    require('./bin/replicate.js'),
    require('./bin/status.js'),
    require('./bin/export.js'),
    require('./bin/diff.js'),
    require('./bin/delete.js'),
    require('./bin/write.js'),
    require('./bin/read.js'),
    require('./bin/forks.js'),
    require('./bin/merge.js'),
    require('./bin/serve.js')
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
