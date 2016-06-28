#!/usr/bin/env node

var args = require('minimist')(process.argv.splice(2), {
  alias: {p: 'port', q: 'quiet', v: 'version'},
  boolean: ['snapshot', 'exit', 'list', 'quiet', 'version']
})

process.title = 'dat'

// set debug before requiring other modules
if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

if (args.version) {
  var pkg = require('../package.json')
  console.log(pkg.version)
  process.exit(0)
}

var isShare = false
var isDownload = false

if (args.doctor || !args._[0]) run()
else getCommand()

function run () {
  if (args.doctor) require('./doctor')(args)
  else if (isShare) require('../commands/share')(args)
  else if (args.list && isDownload) require('../commands/list')(args)
  else if (isDownload) require('../commands/download')(args)
  else require('../usage')('root.txt')
}

function getCommand () {
  if (isDirectory(args._[0], true)) isShare = true
  else if (isDatLink(args._[0])) isDownload = true
  args.dir = isShare ? args._[0] : args._[1]
  args.key = isDownload ? args._[0] : null

  if (isDirectory(args.dir)) run() // catch download dir error TODO: make optional
  else onerror('Invalid Command')
}

function isDatLink (val, quiet) {
  // TODO: support dat.land link
  var isLink = (val.length === 64)
  if (quiet || isLink) return isLink
  onerror('Invalid Dat Link')
}

function isDirectory (val, quiet) {
  try {
    return require('fs').statSync(val).isDirectory() // TODO: support sharing single files
  } catch (err) {
    if (quiet) return false
    onerror('Directory does not exist')
  }
}

function onerror (msg) {
  console.error(msg + '\n')
  require('../usage')('root.txt')
}
