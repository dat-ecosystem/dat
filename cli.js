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
  var pkg = require('./package.json')
  console.log(pkg.version)
  process.exit(0)
}

var fs = require('fs')
var prettyBytes = require('pretty-bytes')
var chalk = require('chalk')
var path = require('path')
var dat = require('dat-server')
var prompt = require('cli-prompt')

var usage = require('./usage')
var getLogger = require('./logger.js')
var doctor = require('./bin/doctor.js')

var cmd = args._[0]
var logger = getLogger(args)

var LOG_INTERVAL = (args.logspeed ? +args.logspeed : 200)
if (isNaN(LOG_INTERVAL)) LOG_INTERVAL = 200
if (!args.color) chalk = new chalk.constructor({enabled: false})

runCommand()

function runCommand () {
  if (args.doctor) return doctor(args)
  if (!cmd) return usage('root.txt')
  var cwd = args.cwd || process.cwd()

  var server = dat()

  if (cmd === 'link') {
    var dirs = args._.slice(1)
    if (dirs.length === 0) onerror('No link created. Do you mean \'dat link .\'?')
    if (dirs.length === 1 && dirs[0].match(/^dat:/)) onerror('No link created. Did you mean `dat ' + dirs[0] + '` ?')
    if (dirs.length > 1) onerror('No link created. You can only provide one LOCATION. \n\n dat link LOCATION')
    link(path.resolve(cwd, dirs[0]), server)
  } else if (cmd === 'status') {
    printStatus(server)
  } else if (cmd === 'start') {
    server.status(function (err, status) {
      if (err) onerror(err)
      var dir = args._[1]
      var dat = status.dats[dir]
      if (dir && !dat) return onerror('Create a link for that directory first.')
      server.join(dat.link, dir, function (err) {
        if (err) onerror(err)
        logger.log(chalk.green('[Success]') + ' Started ' + chalk.bold(dir))
      })
    })
  } else if (cmd === 'stop') {
    server.status(function (err, status) {
      if (err) onerror(err)
      var dir = args._[1]
      var dat = status.dats[dir]
      if (dir && !dat) return onerror('Not sharing a dat for that directory.')
      if (dat) {
        server.leave(dir, function (err) {
          if (err) onerror(err)
          logger.log(chalk.green('[Success]') + ' Stopped serving ' + chalk.bold(dir))
        })
      } else {
        var num = chalk.bold(Object.keys(status.dats).length)
        prompt('This will stop ' + num + ' dats. Are you sure? [y/n]: ', function (res) {
          if (res === 'yes' || res === 'y') {
            server.close(function (err) {
              if (err) onerror(err)
              logger.log(chalk.green('[Success] ') + 'Stopped serving ' + num + ' dats.')
            })
          }
          else process.exit(0)
        })
      }
    })
  } else if (cmd) {
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    var loc = args.path || args._[1]
    if (!loc) return onerror('No download started. Make sure you specify a LOCATION: \n\n  dat LINK LOCATION\n')
    loc = path.resolve(cwd, loc)
    fs.exists(loc, function (exists) {
      if (!exists) {
        fs.mkdir(loc, function () {
          download(hash, loc, server)
        })
      } else download(hash, loc, server)
    })
  }
}

function onerror (err, fatal) {
  console.trace(err)
  process.exit(1)
}

function printSharingLink (stats) {
  var msg = chalk.bold('[Sharing] ')
  msg += chalk.underline.blue('dat://' + stats.link)
  logger.log(msg)
  if (args.quiet) console.log('dat://' + stats.link)
}

function link (dir, server) {
  function done (err, link) {
    if (err) onerror(err)
    server.join(link, dir, function (err) {
      if (err) throw err
      clearInterval(statsInterval)
      server.status(function (err, status) {
        if (err) throw err
        var stats = status.dats
        if (!stats[dir]) return
        var msg = printFileProgress(stats[dir], {
          returnMsg: true, message: 'Files Read to Dat'
        })
        logger.stdout(msg)
        printSharingLink(stats[dir])
      })
    })
  }
  server.link(dir, done)

  var statsInterval = setInterval(printLinkStatus, LOG_INTERVAL)
  var linking = false
  function printLinkStatus () {
    server.status(function (err, status) {
      if (err) onerror(err)
      var stats = status.dats
      if (!stats[dir]) return
      if (stats[dir].total && linking) return printFileProgress(stats[dir], {message: 'Adding Files to Dat'})
      var statusText
      if (stats[dir].total) statusText = chalk.green('[Creating Dat Link]')
      else statusText = chalk.bold.blue('Calculating Size')

      var msg = getScanOutput(stats[dir], statusText)
      logger.stdout(msg)
      if (stats[dir].total) {
        logger.log('')
        linking = true
      }
    })
  }
}

function download (link, dir, server) {
  // download/share
  link = link.replace('dat://', '').replace('//', '')
  var opts = {}
  var parts = link.split(':')
  link = parts[0]
  if (parts.length > 1) {
    var selections = parts[parts.length - 1].split(',')
    opts.files = []
    for (var i = 0; i < selections.length; i++) opts.files.push(selections[i])
  }
  if (link.length !== 64) {
    logger.error('Error: Invalid dat link\n')
    return usage('root.txt')
  }
  logger.stdout(chalk.bold('Connecting...\n'))
  server.joinSync(link, dir, function (err) {
    if (err) onerror(err)
  })
  var downloadInterval = setInterval(function () {
    server.status(function (err, status) {
      if (err) throw err
      var stats = status.dats[dir]
      if (stats.gettingMetadata && !stats.hasMetadata) {
        return getScanOutput(stats, chalk.bold.blue('Getting Metadata')) + '\n'
      }
      if (stats.hasMetadata) {
        // Print final metadata output
        var scanMsg = ''
        stats.gettingMetadata = false
        scanMsg = getScanOutput(stats, chalk.green('[Downloading]'))
        logger.stdout(scanMsg)
        logger.log('')
        logger.log('Type ' + chalk.bold('dat status') + ' to see download progress.')
        clearInterval(downloadInterval)
      }
    })
  }, LOG_INTERVAL)
}

function getScanOutput (stats, statusMsg) {
  if (!statusMsg) statusMsg = chalk.bold.green('Scan Progress')
  var dirCount = stats.total.directories
  return statusMsg + ' ' + chalk.dim(
    stats.total.filesTotal + ' files, ' + dirCount + ' folders, ' +
    (stats.total.bytesTotal ? prettyBytes(stats.total.bytesTotal) + ' total' : '')
  )
}

function printFileProgress (stats, opts) {
  if (!opts) opts = {}
  var totalMsg = opts.message || 'File Progress'
  var msg = ''

  while (true) {
    if (!stats.fileQueue || stats.fileQueue.length === 0) break
    var file = stats.fileQueue[0]
    msg = getSingleFileOutput(file)
    var complete = (file.stats.bytesTotal === file.stats.bytesRead)
    if (!complete && stats.fileQueue.length === 1) break
    if (stats.fileQueue.length === 1 && !queueDone) msg = getSingleFileOutput(file)
    logger.stdout(chalk.dim.green('[Done] ') + chalk.dim(file.name))
    logger.log('')
    stats.fileQueue.shift()
  }

  var queueDone = (stats.total.bytesTotal <= stats.progress.bytesRead)
  if (queueDone) msg = ''
  else msg += '\n'

  if (opts.showFilesOnly && opts.returnMsg) return msg

  msg += getTotalProgressOutput(stats, totalMsg)
  if (opts.returnMsg) return msg
  else logger.stdout(msg)
}

function getSingleFileOutput (file) {
  var fileMsg = ''
  var filePercent = 0
  if (file.stats.bytesTotal > 0) {
    filePercent = Math.floor(
      100 * (file.stats.bytesRead / file.stats.bytesTotal)
    )
  }
  if (filePercent > 0 && filePercent < 100) {
    fileMsg = chalk.bold.blue('[' + ('   ' + filePercent).slice(-3) + '%] ')
  } else {
    fileMsg = chalk.bold.gray('       ') // # spaces = '[100%] '
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
  else if (totalPer >= 0) msg += chalk.bold.dim('[' + ('  ' + totalPer).slice(-3) + '%] ')
  else msg += '        '
  msg += chalk.dim(
    fileProgress + ' of ' + stats.total.filesTotal + ' files' +
    chalk.dim(
      ' (' + prettyBytes(bytesProgress) +
      ' of ' + prettyBytes(stats.total.bytesTotal) + ') '
    )
  )
  if (stats.downloadRate) msg += chalk.dim(prettyBytes(stats.downloadRate) + '/s ')
  msg += '\n'
  return msg
}

function printStatus (server) {
  server.status(function (err, status) {
    if (err) throw err
    var count = '0'
    var activePeers = status.swarm.connections.length
    var totalPeers = status.swarm.connecting + status.swarm.connections.length
    if (activePeers > 0) count = activePeers + '/' + totalPeers
    var keys = Object.keys(status.dats)
    var msg = 'Sharing ' + chalk.bold(keys.length) + ' Dats, connected to ' + chalk.bold(count) + ' sources\n'
    logger.log(msg)
    if (keys.length === 0) return
    for (var key in keys) {
      var dir = keys[key]
      var dat = status.dats[dir]
      msg = ''
      msg += chalk.bold('[' + dat.state + ']\n')
      msg += dir + '\n'
      msg += chalk.underline.blue('dat://' + dat.link) + '\n'
      if (dat.progress.bytesRead !== dat.total.bytesTotal) msg += getTotalProgressOutput(dat, '')
      msg += prettyBytes(dat.total.bytesTotal) + '\n'
      logger.log(msg)
    }
  })
}
