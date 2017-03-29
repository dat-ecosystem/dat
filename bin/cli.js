#!/usr/bin/env node

var fs = require('fs')
var mkdirp = require('mkdirp')
var subcommand = require('subcommand')
var encoding = require('dat-encoding')
var debug = require('debug')('dat')
var usage = require('../lib/usage')

process.title = 'dat'

var config = {
  defaults: [
    { name: 'dir', default: process.cwd(), help: 'set the directory for Dat' },
    { name: 'logspeed', default: 200 },
    { name: 'port', default: 3282, help: 'port to use for connections' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' },
    { name: 'debug', default: process.env.DEBUG }, // TODO: does not work right now
    { name: 'quiet', default: false, boolean: true },
    { name: 'verifyReplicationReads', default: true, boolean: true }
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
    require('../lib/commands/clone'),
    require('../lib/commands/create'),
    require('../lib/commands/doctor'),
    require('../lib/commands/publish'),
    require('../lib/commands/unpublish'),
    require('../lib/commands/pull'),
    require('../lib/commands/share'),
    require('../lib/commands/snapshot'),
    require('../lib/commands/sync'),
    require('../lib/commands/auth/register'),
    require('../lib/commands/auth/whoami'),
    require('../lib/commands/auth/logout'),
    require('../lib/commands/auth/login')
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
  debug(opts)

  if (opts._.length > 1) {
    // dat <link> {dir} - clone/resume <link> in {dir}
    try {
      debug('Clone sync')
      opts.key = encoding.toStr(opts._[0])
      opts.dir = opts._[1]
      // make dir & start download
      debug('mkdirp', opts.dir)
      // TODO: do I want to mkdirp? or only one child?
      mkdirp(opts.dir, function () {
        require('../lib/download')('sync', opts)
      })
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
        require('../lib/commands/sync').command(opts)
      })
    } catch (e) { return done() }
  }

  function done () {
    return usage(opts)
  }
}
