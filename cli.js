#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))

process.title = 'dat'

// set debug before requiring other modules
if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

if (args.version || args.v) {
  var pkg = require(__dirname + '/package.json')
  console.log(pkg.version)
  process.exit(0)
}

var fs = require('fs')
var singleLineLog = require('single-line-log')
var prettyBytes = require('pretty-bytes')
var xtend = require('xtend')
var dat = require('./index.js')
var usage = require('./usage')

function noop () {}

var cmd = args._[0]
var logger = getLogger()

checkLocation()

function checkLocation () {
  var loc = process.cwd()
  if (!args.path) return runCommand(loc)
  loc = args.path
  fs.exists(loc, function (exists) {
    if (!exists) {
      logger.error('Does not exist:', loc)
      return usage('root.txt')
    }
    runCommand(loc)
  })
}

function runCommand (loc) {
  var db = dat({home: args.home, path: loc})

  if (cmd === 'link') link(loc, db)
  else if (cmd === 'list') list(loc, db)
  else if (cmd) download(loc, db)
  else return usage('root.txt')
}

function link (loc, db) {
  var dirs = args._.slice(1)
  if (dirs.length === 0) dirs = loc
  var statsScan = db.fileStats(dirs, function (err, stats) {
    if (err) throw err
    printScanProgress(stats)
    clearInterval(scanInterval)
    logger.log('') // newline
    var statsAdd = db.addFiles(dirs, function (err, link) {
      printAddProgress(statsAdd, statsScan.files)
      clearInterval(addInterval)
      if (err) throw err
      db.joinTcpSwarm(link, function (_err, swarm) {
        // ignore _err
        logger.log('') // newline
        logger.log('Link: dat://' + swarm.link)
        startProgressLogging({swarm: swarm})
      })
    })

    var addInterval = setInterval(function () {
      printAddProgress(statsAdd, statsScan.files)
    }, 100)
  })

  var scanInterval = setInterval(function () {
    printScanProgress(statsScan)
  }, 100)
}

function list (loc, db) {
  db = dat({home: args.home})
  db.drive._links.createValueStream().on('data', function (o) {
    logger.log(o)
  })
}

function download (loc, db) {
  // download/share
  var hash = args._[0]
  if (!hash) return usage('root.txt')
  hash = hash.trim().replace('dat://', '').replace('dat:', '')
  if (hash.length !== 64) {
    logger.error('Error: Invalid dat link\n')
    return usage('root.txt')
  }
  var downloadStats = db.download(hash, loc, function (err, swarm) {
    if (err) throw err
    swarm.downloading = false
    swarm.downloadComplete = true
  })
  startProgressLogging(downloadStats)
}

function startProgressLogging (stats) {
  setInterval(function () {
    printSwarmStatus(stats)
  }, 500)
  printSwarmStatus(stats)

  process.on('SIGINT', function () {
    process.exit(1)
    setTimeout(function () {
      // sigterm if it is still running
      process.kill(process.pid)
    }, 2000)
  })
}

function printScanProgress (stats) {
  var dirCount = stats.directories + 1 // parent folder
  logger.stdout(
    'Creating share link for ' + stats.files + ' files, ' +
    dirCount + ' folders,' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total' : '')
  )
}

function printAddProgress (stats, total) {
  logger.stdout('Fingerprinting file contents (' + stats.files + '/' + total + ')')
}

function printSwarmStatus (stats) {
  var swarm = stats.swarm
  if (!swarm) return logger.stdout('Finding data sources...\n')
  var totalCount = swarm.blocks
  var downloadCount = stats.files + stats.directories
  var activePeers = xtend({}, swarm.activeInboundPeers, swarm.activeOutboundPeers)
  var activeCount = Object.keys(activePeers).length

  var msg = ''
  var count = '0'
  if (swarm.peerCount > 0) count = activeCount + '/' + swarm.peerCount
  if ((swarm.downloading || swarm.downloadComplete) && stats.downloaded > 0) {
    msg += 'Downloaded ' + downloadCount + '/' + totalCount + ' files' +
           ' (' + prettyBytes(stats.downloadRate()) + '/s, ' + prettyBytes(stats.downloaded) + ' total)\n'
  }
  if (swarm.downloadComplete) msg += 'Download complete, sharing data. Connected to ' + count + ' peers\n'
  else if (swarm.downloading) msg += 'Connected to ' + count + ' peers\n'
  else msg += 'Sharing data on port ' + swarm.port + ', connected to ' + count + ' peers\n'
  logger.stdout(msg)
}

function getLogger () {
  if (args.quiet || args.q) {
    return {
      stderr: noop,
      stdout: noop,
      log: noop,
      error: noop
    }
  }

  if (args.debug) {
    return {
      stderr: console.error.bind(console),
      stdout: console.log.bind(console),
      log: console.error.bind(console),
      error: console.log.bind(console)
    }
  }

  return {
    stderr: singleLineLog.stderr,
    stdout: singleLineLog.stdout,
    log: console.log.bind(console),
    error: console.error.bind(console)
  }
}
