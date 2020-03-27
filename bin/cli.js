#!/usr/bin/env node

var subcommand = require('subcommand')
var debug = require('debug')('dat')
var usage = require('../src/usage')
var pkg = require('../package.json')

process.title = 'dat'

// Check node version to make sure we support
var NODE_VERSION_SUPPORTED = 4
var nodeMajorVer = process.version.match(/^v([0-9]+)\./)[1]
var invalidNode = nodeMajorVer < NODE_VERSION_SUPPORTED
if (invalidNode) exitInvalidNode()
else {
  var notifier = require('update-notifier')
  notifier({ pkg: pkg })
    .notify({
      defer: true,
      isGlobal: true,
      boxenOpts: {
        align: 'left',
        borderColor: 'green',
        borderStyle: 'classic',
        padding: 1,
        margin: { top: 1, bottom: 1 }
      }
    })
}

if (debug.enabled) {
  debug('Dat DEBUG mode engaged, enabling quiet mode')
}

var config = {
  defaults: [
    { name: 'dir', abbr: 'd', help: 'set the directory for Dat' },
    { name: 'logspeed', default: 400 },
    { name: 'port', help: 'port to use for connections (default port: 3282 or first available)' },
    { name: 'utp', default: true, boolean: true, help: 'use utp for discovery' },
    { name: 'http', help: 'serve dat over http (default port: 8080)' },
    { name: 'debug', default: !!process.env.DEBUG && !debug.enabled, boolean: true },
    { name: 'quiet', default: debug.enabled, boolean: true }, // use quiet for dat debugging
    { name: 'sparse', default: false, boolean: true, help: 'download only requested data' },
    { name: 'up', help: 'throttle upload bandwidth (1024, 1kb, 2mb, etc.)' },
    { name: 'down', help: 'throttle download bandwidth (1024, 1kb, 2mb, etc.)' }
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
    require('../src/commands/log'),
    require('../src/commands/keys'),
    require('../src/commands/publish'),
    require('../src/commands/pull'),
    require('../src/commands/status'),
    require('../src/commands/sync'),
    require('../src/commands/unpublish'),
    require('../src/commands/auth/register'),
    require('../src/commands/auth/whoami'),
    require('../src/commands/auth/logout'),
    require('../src/commands/auth/login')
  ],
  usage: {
    command: showUsageOrRunExtension,
    option: {
      name: 'help',
      abbr: 'h'
    }
  },
  aliases: {
    'init': 'create',
    'share': 'sync'
  },
  // whitelist extensions for now
  extensions: [
    'store'
  ]
}

if (debug.enabled) {
  debug('dat', pkg.version)
  debug('node', process.version)
}

// Match Args + Run command
var match = subcommand(config)
match(alias(process.argv.slice(2)))

function alias (argv) {
  var cmd = argv[0]
  if (!config.aliases[cmd]) return argv
  argv[0] = config.aliases[cmd]
  return argv
}

// CLI Shortcuts
// Commands:
//   dat <dat://key> [<dir>] - clone/sync a key
//   dat <dir> - create dat + share a directory
//   dat <extension>
function syncShorthand (opts) {
  if (!opts._.length) return usage(opts)
  debug('Sync shortcut command')

  debug('Trying extension', opts._[0])
  // First try extension
  if (config.extensions.indexOf(opts._[0]) > -1) return require('../src/extensions')(opts)

  var parsed = require('../src/parse-args')(opts)

  // Download Key
  if (parsed.key) {
    // dat  <dat://key> [<dir>] - clone/resume <link> in [dir]
    debug('Clone sync')
    opts.dir = parsed.dir || parsed.key // put in `process.cwd()/key` if no dir
    opts.exit = opts.exit || false
    return require('../src/commands/clone').command(opts)
  }

  // Sync dir
  // dat <dir> - sync existing dat in {dir}
  if (parsed.dir) {
    opts.shortcut = true
    debug('Share sync')

    // Set default opts. TODO: use default opts in share
    opts.watch = opts.watch || true
    opts.import = opts.import || true
    return require('../src/commands/sync').command(opts)
  }

  // All else fails, show usage
  return usage(opts)
}

// This was needed so that we can show help messages from extensions
function showUsageOrRunExtension (opts, help, usageMessage) {
  if (config.extensions.indexOf(opts._[0]) > -1) return require('../src/extensions')(opts)
  usage(opts, help, usageMessage)
}

function exitInvalidNode () {
  console.error('Node Version:', process.version)
  console.error('Unfortunately, we only support Node >= v4. Please upgrade to use Dat.')
  console.error('You can find the latest version at https://nodejs.org/')
  process.exit(0)
}
