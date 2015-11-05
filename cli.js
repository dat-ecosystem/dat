#!/usr/bin/env node
var subcommand = require('subcommand')

var config = {
  root: require('./bin/root.js'),
  commands: [
    require('./bin/checkout.js'),
    require('./bin/clone.js'),
    require('./bin/destroy.js'),
    require('./bin/log.js'),
    require('./bin/pull.js'),
    require('./bin/push.js'),
    require('./bin/add.js'),
    require('./bin/help.js'),
    require('./bin/serve.js'),
    require('./bin/commit.js'),
    require('./bin/status.js')
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
