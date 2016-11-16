#!/usr/bin/env node

var realFs = require('fs')
var gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(realFs)
var mkdirp = require('mkdirp')
var usage = require('../usage')
var Dat = require('dat-js')

var args = require('minimist')(process.argv.splice(2), {
  alias: {p: 'port', q: 'quiet', v: 'version'},
  boolean: ['watchFiles', 'snapshot', 'exit', 'list', 'quiet', 'version', 'utp', 'temp', 'ignore-hidden'],
  default: {
    logspeed: 200,
    'ignore-hidden': true,
    utp: true,
    watchFiles: false
  }
})

process.title = 'dat'

// set debug before requiring other modules
if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  args.quiet = true
  process.env.DEBUG = debug
}

if (args.version) {
  var pkg = require('../package.json')
  console.log(pkg.version)
  process.exit(0)
}

if (args.webrtc) onerror('webrtc no longer supported')

var isShare = false
var isDownload = false

args.logspeed = +args.logspeed
if (isNaN(args.logspeed)) args.logspeed = 200

if (args.doctor || !args._[0]) run()
else getCommand()

function run () {
  if (args.temp) args.db = require('memdb')()
  if (args.doctor) require('./doctor')(args)
  else {
    if (isShare) require('../commands/share')(Dat(args), args)
    else if (args.list && isDownload) require('../commands/list')(Dat(args), args)
    else if (isDownload) require('../commands/download')(Dat(args), args)
    else usage('root.txt')
  }
}

function getCommand () {
  if (args._[0].indexOf('dat://') > -1) args._[0] = args._[0].replace('dat://', '')
  if (args._[0].indexOf('dat.land') > -1) {
    args._[0] = args._[0].replace('dat.land/', '').replace(/^(http|https):\/\//, '')
  }
  if (isDirectory(args._[0], true)) isShare = true
  else if (isDatLink(args._[0])) isDownload = true
  args.dir = isShare ? args._[0] : args._[1]
  args.key = isDownload ? args._[0] : null

  if (isShare) run()
  else if (args.dir && isDownload && !isDirectory(args.dir, true)) mkdirp(args.dir, run)
  else if (args.dir && isDownload) run()
  else if (!args.dir) usage('root.txt') // TODO: don't require for download
  else onerror('Invalid Command') // Should never get here...
}

function isDatLink (val, quiet) {
  // TODO: switch to using dat-encoding here
  var isLink = (val.length === 50 || val.length === 64)
  if (quiet || isLink) return isLink
  onerror('Invalid Dat Link')
}

function isDirectory (val, quiet) {
  try {
    return gracefulFs.statSync(val).isDirectory() // TODO: support sharing single files
  } catch (err) {
    if (quiet) return false
    onerror('Directory does not exist')
  }
}

function onerror (msg) {
  console.error(msg + '\n')
  process.exit(1)
  // require('../usage')('root.txt')
}
