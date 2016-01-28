#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))

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
var dat = require('./index.js')
var usage = require('./usage')

function noop () {}

var cmd = args._[0]
var logger = getLogger()
runCommand()

function runCommand () {
  var loc = args.path || process.cwd()
  fs.exists(loc, function (exists) {
    if (!exists) {
      logger.error('Does not exist:', loc)
      return usage('root.txt')
    }

    var db = dat({home: args.home, path: loc})

    if (cmd === 'link') link(loc, db)
    else if (cmd === 'list') list(loc, db)
    else if (cmd) download(loc, db)
    else return usage('root.txt')
  })
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
  var swarmInterval = setInterval(function () {
    printSwarmStatus(stats)
  }, 500)
  printSwarmStatus(stats)

  // intercept ctrl+c and do graceful exit
  process.on('SIGINT', function () {
    clearInterval(swarmInterval)
    if (!stats.swarm) return process.exit(0)
    stats.swarm.close(function (err) {
      if (err) throw err
      else process.exit(0)
    })
  })
}

function printScanProgress (stats) {
  logger.stdout(
    'Creating share link for ' + stats.files + ' files in ' +
    stats.directories + ' directories,' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total' : '')
  )
}

function printAddProgress (stats, total) {
  logger.stdout('Fingerprinting file contents (' + stats.files + '/' + total + ')')
}

function printSwarmStatus (stats) {
  var swarm = stats.swarm
  if (!swarm || swarm.peerCount === 0 && swarm.downloading) return logger.stdout('Finding data sources...\n')
  var totalCount = swarm.blocks
  var downloadCount
  if (stats) downloadCount = stats.files + stats.directories
  var inbound = swarm.inboundConnections.sockets
  var outbound = Object.keys(swarm.outboundConnections)
  var socketCount = inbound.length + outbound.length

  var msg = ''
  var count = '0'
  if (swarm.peerCount > 0) count = socketCount + '/' + swarm.peerCount
  if (swarm.downloading || swarm.downloadComplete) {
    msg += 'Downloaded ' + downloadCount + '/' + totalCount + ' files' +
           ' (' + prettyBytes(stats.downloadRate) + '/s, ' + prettyBytes(stats.downloaded) + ' total)\n'
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
