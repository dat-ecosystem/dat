#!/usr/bin/env node

var fs = require('fs')
var mkdirp = require('mkdirp')
var usage = require('../usage')
var Dat = require('dat-js')

var args = require('minimist')(process.argv.splice(2), {
  alias: {p: 'port', q: 'quiet', v: 'version'},
  boolean: ['snapshot', 'exit', 'list', 'quiet', 'version', 'utp', 'temp', 'webrtc', 'ignore-hidden'],
  string: ['signalhub'],
  default: {
    logspeed: 200,
    'ignore-hidden': true,
    utp: true
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

if (args.webrtc) {
  try {
    args.webrtc = require('electron-webrtc')()
  } catch (e) {
    onerror('npm install -g electron-webrtc for webrtc support')
  }
}

var isShare = false
var isDownload = false

args.logspeed = +args.logspeed
if (isNaN(args.logspeed)) args.logspeed = 200

if (args.doctor || !args._[0]) run()
else getCommand()

function run () {
  if (args.temp) args.db = require('memdb')()
  var dat = Dat(args)
  if (args.doctor) require('./doctor')(dat, args)
  else if (isShare) require('../commands/share')(dat, args)
  else if (args.list && isDownload) require('../commands/list')(dat, args)
  else if (isDownload) require('../commands/download')(dat, args)
  else usage('root.txt')
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
    return fs.statSync(val).isDirectory() // TODO: support sharing single files
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
