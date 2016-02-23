#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2), {
  alias: {p: 'port', q: 'quiet', v: 'version'},
  boolean: ['color'],
  default: {color: true}
})

process.title = 'dat'

// set debug before requiring other modules
if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

if (args.version) {
  var pkg = require(__dirname + '/package.json')
  console.log(pkg.version)
  process.exit(0)
}

var fs = require('fs')
var singleLineLog = require('single-line-log')
var prettyBytes = require('pretty-bytes')
var chalk = require('chalk')
var dat = require('./index.js')
var usage = require('./usage')

function noop () {}

var cmd = args._[0]
var logger = getLogger()

var LOG_INTERVAL = (args.logspeed ? +args.logspeed : 200)
if (isNaN(LOG_INTERVAL)) LOG_INTERVAL = 200
if (!args.color) chalk = new chalk.constructor({enabled: false})

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
  if (!cmd) return usage('root.txt')

  var db = dat({home: args.home})

  if (cmd === 'link') link(loc, db)
  else if (cmd === 'list') list(loc, db)
  else if (cmd) download(loc, db)
}

function link (loc, db) {
  var dirs = args._.slice(1)
  if (dirs.length === 0) dirs = loc

  var statsScan = db.fileStats(dirs, function (err, stats) {
    if (err) throw err
    printScanProgress(stats, true)
    clearInterval(scanInterval)
    logger.log('') // newline
    var statsAdd = db.addFiles(dirs, function (err, link) {
      printAddProgress(statsAdd, statsScan)
      clearInterval(addInterval)
      if (err) throw err
      db.joinTcpSwarm({link: link, port: args.port}, function (_err, swarm) {
        // ignore _err
        logger.stdout('') // clear progress lines
        logger.log(
          chalk.green.bold('Your Dat Link: ') +
          chalk.underline.blue('dat://' + swarm.link)
        )
        startProgressLogging({swarm: swarm})
      })
    })

    var addInterval = setInterval(function () {
      printAddProgress(statsAdd, statsScan)
    }, LOG_INTERVAL)
  })

  var scanInterval = setInterval(function () {
    printScanProgress(statsScan)
  }, LOG_INTERVAL)
}

function list (loc, db) {
  var hash = args._[1]
  db.joinTcpSwarm({link: hash, port: args.port}, function (err, swarm) {
    if (err) throw err
    var archive = db.drive.get(swarm.link, loc)
    archive.ready(function (err) {
      if (err) throw err
      archive.createEntryStream().on('data', function (o) {
        logger.log(o)
      })
    })
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
  }, LOG_INTERVAL)
  printSwarmStatus(stats)

  process.on('SIGINT', function () {
    process.exit(1)
    setTimeout(function () {
      // sigterm if it is still running
      process.kill(process.pid)
    }, 2000)
  })
}

function printScanProgress (stats, last) {
  var dirCount = stats.directories + 1 // parent folder
  var msg = chalk.bold.blue('Calculating Size: ')
  if (last) msg = chalk.bold.green('Creating Dat Link ')
  msg += chalk.bold(
    '(' + stats.files + ' files, ' + dirCount + ' folders, ' +
    (stats.size ? prettyBytes(stats.size) + ' total' : '') + ')'
  )
  logger.stdout(msg)
}

function printAddProgress (statsAdd, statsScan) {
  var msg = ''
  var stats = statsAdd
  // make stats API consistent w/ download stats
  stats.totalStats = {
    bytesTotal: statsScan.size,
    filesTotal: statsScan.files
  }

  while (true) {
    if (stats.files.length === 0) break
    var file = stats.files[0]
    var complete = (file.stats.bytesTotal === file.stats.bytesRead)
    file.complete = complete
    msg = fileProgressMsg(file, msg)
    if (complete) stats.files.shift()
    else break
  }

  msg += '\n' + totalProgressMsg(stats, 'Adding Files to Dat')
  logger.stdout(msg)
}

function printSwarmStatus (stats) {
  var swarm = stats.swarm
  if (!swarm) return logger.stdout(chalk.bold.blue('STATUS: ') + 'Finding data sources...\n')

  var msg = swarm.downloading ? downloadMsg() : ''
  if (swarm.downloadComplete) msg = downloadCompleteMsg()
  msg += chalk.bold.blue('STATUS: ')

  var count = '0'
  var activePeers = swarm.connections.length
  var totalPeers = swarm.connecting + swarm.connections.length
  if (!swarm.downloading) msg += 'Sharing data. '
  if (activePeers > 0) count = activePeers + '/' + totalPeers
  msg += chalk.blue('Connected to ' + count + ' sources\n')
  logger.stdout(msg)

  function downloadMsg () {
    if (!stats.progressStats.bytesDownloaded) return chalk.magenta('       Starting...\n')
    // TODO: add file progress
    return totalProgressMsg(stats, 'Downloading Files from Dat')
  }

  function downloadCompleteMsg () {
    stats.downloadRate = null // Remove download speed display
    return totalProgressMsg(stats, 'Download Complete')
  }
}

function fileProgressMsg (file, msg) {
  var indent = '  ' // indent for single file info
  if (file.complete) {
    if (msg === '') {
      // hack to avoid flashing no progress
      msg += chalk.bold.gray(indent + '[' + 100 + '%] ')
      msg += chalk.blue(file.name) + '\n'
    }
    logger.stdout(chalk.green.dim(indent + '[Done] ') + chalk.dim(file.name))
    logger.log('')
  }

  var filePercent = 0
  if (file.stats.bytesTotal > 0) {
    filePercent = Math.floor(
      100 * (file.stats.bytesRead / file.stats.bytesTotal)
    )
  }
  // = to overwrite fake 100% msg
  if (filePercent > 0) {
    msg = chalk.bold.gray(indent + '[' + ('   ' + filePercent).slice(-3) + '%] ')
  } else {
    msg = chalk.bold.gray(indent + '       ') // # spaces = '[100%] '
  }
  msg += chalk.blue(file.name)
  return msg
}

function totalProgressMsg (stats, statusText, msg) {
  if (!stats) return ''
  if (!msg) msg = ''

  var bytesProgress = stats.progressStats.bytesDownloaded
  var fileProgress = stats.progressStats.filesDownloaded

  if (stats.progressStats.bytesRead > 0) {
    bytesProgress = stats.progressStats.bytesRead
    fileProgress = stats.progressStats.filesRead
  }

  var totalPer = Math.floor(100 * (bytesProgress / stats.totalStats.bytesTotal))
  if (totalPer >= 0) msg += chalk.bold.red('[' + ('  ' + totalPer).slice(-3) + '%] ')
  else msg += '        '
  msg += chalk.magenta(
    statusText + ': ' + fileProgress + ' of ' + stats.totalStats.filesTotal +
    chalk.dim(
      ' (' + prettyBytes(bytesProgress) +
      ' of ' + prettyBytes(stats.totalStats.bytesTotal) + ') '
    )
  )
  if (stats.downloadRate) msg += chalk.red(prettyBytes(stats.downloadRate()) + '/s ')
  msg += '\n'
  return msg
}

function getLogger () {
  if (args.quiet) {
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
