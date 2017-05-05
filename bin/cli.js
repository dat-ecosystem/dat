#!/usr/bin/env node

var fs = require('fs')
var mkdirp = require('mkdirp')
var subcommand = require('subcommand')
var encoding = require('dat-encoding')
var debug = require('debug')('dat')
var usage = require('../src/usage')

process.title = 'dat'

var isDebug = debug.enabled || !!process.env.DEBUG // neat-log uses quiet for debug right now

var config = {
  defaults: [
    { name: 'dir', help: 'set the directory for Dat' },
    { name: 'logspeed', default: 400 },
    { name: 'port', default: 3282, help: 'port to use for connections' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' },
    { name: 'quiet', default: isDebug, boolean: true }
  ],
  root: {
    options: [
      {
        name: 'version',
        boolean: true,
        default: false,
        abbr: 'v'
      }
    ],
    command: usage
  },
  none: syncShorthand,
  commands: [
    require('../src/commands/clone'),
    require('../src/commands/create'),
    require('../src/commands/doctor'),
    require('../src/commands/publish'),
    require('../src/commands/pull'),
    require('../src/commands/share'),
    require('../src/commands/sync'),
    require('../src/commands/auth/register'),
    require('../src/commands/auth/whoami'),
    require('../src/commands/auth/logout'),
    require('../src/commands/auth/login')
  ],
  usage: {
    command: usage,
    option: {
      name: 'help',
      abbr: 'h'
    }
  },
  aliases: {
    'init': 'create'
  }
}

var match = subcommand(config)
match(alias(process.argv.slice(2)))

function alias (argv) {
  var cmd = argv[0]
  if (!config.aliases[cmd]) return argv
  argv[0] = config.aliases[cmd]
  return argv
}

function syncShorthand (opts) {
  if (!opts._.length) return done()
  debug('Sync shortcut command')

  if (opts._.length > 1) {
    // dat <link> {dir} - clone/resume <link> in {dir}
    try {
      debug('Clone sync')
      opts.key = encoding.toStr(opts._[0])
      opts.dir = opts._[1]
      require('../src/commands/clone').command(opts)
    } catch (e) { return done() }
  } else {
    // dat {dir} - sync existing dat in {dir}
    try {
      debug('Share sync')
      opts.dir = opts._[0]
      fs.stat(opts.dir, function (err, stat) {
        if (err || !stat.isDirectory()) return usage(opts)

        // Set default opts. TODO: use default opts in sync
        opts.watch = opts.watch || true
        opts.import = opts.import || true
        require('../src/commands/sync').command(opts)
      })
    } catch (e) { return done() }
  }

  function done () {
    return usage(opts)
  }
}
