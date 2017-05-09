#!/usr/bin/env node

var fs = require('fs')
var subcommand = require('subcommand')
var encoding = require('dat-encoding')
var debug = require('debug')('dat')
var usage = require('../src/usage')

process.title = 'dat'

// Check node version to make sure we support
var NODE_VERSION_SUPPORTED = 4
var nodeMajorVer = process.version.match(/^v([0-9]+)\./)[1]
var invalidNode = nodeMajorVer < NODE_VERSION_SUPPORTED
if (invalidNode) exitInvalidNode()

var isDebug = debug.enabled || !!process.env.DEBUG

var config = {
  defaults: [
    { name: 'dir', abbr: 'd', help: 'set the directory for Dat' },
    { name: 'logspeed', default: 400 },
    { name: 'port', default: 3282, help: 'port to use for connections' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' },
    { name: 'quiet', default: isDebug, boolean: true }, // neat-log uses quiet for debug right now
    { name: 'showKey', abbr: 'show-key', default: false, boolean: true }
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
      opts.exit = false
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

function exitInvalidNode () {
  console.error('Node Version:', process.version)
  console.error('Unfortunately, we only support Node >= v4. Please upgrade to use Dat.')
  console.error('You can find the latest version at https://nodejs.org/')
  process.exit(1)
}
