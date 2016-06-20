#!/usr/bin/env node
var path = require('path')
var level = require('level')
var mkdirp = require('mkdirp')

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
  var pkg = require('./package.json')
  console.log(pkg.version)
  process.exit(0)
}

var isShare = false
var isDownload = false

if (args.doctor || !args._[0]) {
  run()
} else {
  getCommand()
}

function run () {
  if (args.doctor) {
    require('./bin/doctor')(args)
  } else if (isShare) {
    require('./bin/share')(args)
  } else if (args.list && isDownload) {
    require('./bin/list')(args)
  } else if (isDownload) {
    require('./bin/download')(args)
  } else {
    require('./usage')('root.txt')
  }
}

function getCommand () {
  if (isDirectory(args._[0], true)) isShare = true
  else if (isDatLink(args._[0])) isDownload = true
  args.dir = isShare ? args._[0] : args._[1]
  args.key = isDownload ? args._[0] : null

  if (isShare || isDownload) getDatDb()
  else run()
}

function getDatDb () {
  var dir = args.dir || '.'
  args.datDb = args.datDb || path.join(dir, '.dat')

  var isNewDownload = (isDownload && !isDirectory(args.datDb, true))
  if (isNewDownload) {
    if (dir !== '.') mkdirp.sync(args.datDb)
    args.level = level(args.datDb)
    run()
  } else {
    if (isDownload) args.dir = '.' // resume download in cwd
    checkResume()
  }

  function checkResume () {
    var db = args.level = level(args.datDb)
    if (args.port) db.put('!dat!port', args.port)
    db.get('!dat!key', function (err, value) {
      if (err) return run()
      if (isDownload && args.key !== value) {
        // TODO: prompt to overwrite existing dat
        console.error('Existing .dat folder does not match key.')
        process.exit(0)
      }
      args.key = value
      args.resume = true
      db.get('!dat!port', function (err, portVal) {
        if (err) return run()
        if (portVal) args.port = portVal
        run()
      })
    })
  }
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
  require('./usage')('root.txt')
}
