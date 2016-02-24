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

  var stats = {}

  stats.total = db.fileStats(dirs, function (err) {
    if (err) throw err
    printScanProgress(stats, {done: true})
    clearInterval(scanInterval)
    var statsProgress = db.addFiles(dirs, function (err, link) {
      printAddProgress(stats, {done: true})
      clearInterval(addInterval)
      if (err) throw err
      db.joinTcpSwarm({link: link, port: args.port}, function (_err, swarm) {
        // ignore _err
        startProgressLogging({swarm: swarm})
      })
    })
    stats.progress = statsProgress.progress
    stats.fileQueue = statsProgress.fileQueue

    var addInterval = setInterval(function () {
      printAddProgress(stats)
    }, LOG_INTERVAL)
  })

  var scanInterval = setInterval(function () {
    printScanProgress(stats)
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

function printScanProgress (stats, opts) {
  if (!opts) opts = {}
  var dirCount = stats.total.directories + 1 // parent folder
  var msg = chalk.bold.blue('Calculating Size: ')
  if (opts.done) msg = chalk.bold.green('Creating Dat Link ')
  msg += chalk.bold(
    '(' + stats.total.filesTotal + ' files, ' + dirCount + ' folders, ' +
    (stats.total.bytesTotal ? prettyBytes(stats.total.bytesTotal) + ' total' : '') + ')'
  )
  logger.stdout(msg)
  if (opts.done) logger.log('')
}

function printAddProgress (stats, opts) {
  if (!opts) opts = {}
  if (opts.done) {
    var msg = printFileProgress(stats, {
      returnMsg: true, message: 'Files Read to Dat'
    })
    logger.stdout(msg)
    logger.log('')
  } else {
    printFileProgress(stats, {message: 'Adding Files to Dat'})
  }
}

function printSwarmStatus (stats) {
  var swarm = stats.swarm
  if (!swarm) return logger.stdout(chalk.bold('[Status]\n') + '  Finding data sources...\n')

  var msg = swarm.downloading ? downloadMsg() : ''
  if (swarm.downloadComplete) msg = downloadCompleteMsg()
  msg += chalk.green.bold('Your Dat Link: ') +
          chalk.underline.blue('dat://' + swarm.link)
  msg += chalk.bold('\n[Status]\n')

  var count = '0'
  var activePeers = swarm.connections.length
  var totalPeers = swarm.connecting + swarm.connections.length
  if (!swarm.downloading) msg += chalk.blue('  Sharing data\n')
  else if (swarm.downloading) msg += chalk.blue('  Downloading\n')
  if (activePeers > 0) count = activePeers + '/' + totalPeers
  msg += chalk.blue('  Connected to ' + count + ' sources\n')
  logger.stdout(msg)

  function downloadMsg () {
    if (!stats.progress.bytesRead) return chalk.magenta('       Starting...\n')
    return printFileProgress(stats, {
      returnMsg: true, message: 'Downloading Data'
    })
  }

  function downloadCompleteMsg () {
    stats.downloadRate = null // Remove download speed display
    return printFileProgress(stats, {
      returnMsg: true, message: 'Download Complete'
    })
  }
}

function printFileProgress (stats, opts) {
  if (!opts) opts = {}
  var totalMsg = opts.message || 'File Progress'
  var indent = '  ' // indent for single file info
  var msg = ''

  while (true) {
    if (stats.fileQueue.length === 0) break
    var file = stats.fileQueue[0]
    msg = getSingleFileOutput(file)
    var complete = (file.stats.bytesTotal === file.stats.bytesRead)
    if (!complete && stats.fileQueue.length === 1) break
    if (stats.fileQueue.length === 1 && !queueDone) msg = getSingleFileOutput(file)
    logger.stdout(chalk.green.dim(indent + '[Done] ') + chalk.dim(file.name))
    logger.log('')
    stats.fileQueue.shift()
  }

  var queueDone = (stats.total.bytesTotal <= stats.progress.bytesRead)
  if (queueDone) msg = ''
  else msg += '\n'

  msg += getTotalProgressOutput(stats, totalMsg)
  if (opts.returnMsg) return msg
  else logger.stdout(msg)
}

function getSingleFileOutput (file) {
  var fileMsg = ''
  var indent = '  ' // indent for single file info
  var filePercent = 0
  if (file.stats.bytesTotal > 0) {
    filePercent = Math.floor(
      100 * (file.stats.bytesRead / file.stats.bytesTotal)
    )
  }
  if (filePercent > 0 && filePercent < 100) {
    fileMsg = chalk.bold.gray(indent + '[' + ('   ' + filePercent).slice(-3) + '%] ')
  } else {
    fileMsg = chalk.bold.gray(indent + '       ') // # spaces = '[100%] '
  }
  fileMsg += chalk.blue(file.name)
  return fileMsg
}

function getTotalProgressOutput (stats, statusText, msg) {
  if (!stats) return ''
  if (!msg) msg = ''

  var bytesProgress = stats.progress.bytesRead
  var fileProgress = stats.progress.filesRead
  var totalPer = Math.floor(100 * (bytesProgress / stats.total.bytesTotal))

  if (totalPer === 100) msg += chalk.bold.green('[Done] ')
  else if (totalPer >= 0) msg += chalk.bold.red('[' + ('  ' + totalPer).slice(-3) + '%] ')
  else msg += '        '
  msg += chalk.magenta(
    statusText + ': ' + fileProgress + ' of ' + stats.total.filesTotal +
    chalk.dim(
      ' (' + prettyBytes(bytesProgress) +
      ' of ' + prettyBytes(stats.total.bytesTotal) + ') '
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
