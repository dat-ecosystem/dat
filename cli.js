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
var dns = require('dns-discovery')
var swarm = require('discovery-swarm')
var chalk = require('chalk')
var crypto = require('crypto')
var pump = require('pump')
var xtend = require('xtend')
var dat = require('./index.js')
var usage = require('./usage')
var getLogger = require('./logger.js')

var cmd = args._[0]
var logger = getLogger(args)

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
      fs.mkdir(loc, function () {
        runCommand(loc)
      })
    }
    return runCommand(loc)
  })
}

function runDoctor () {
  var client = dns({
    servers: dat.DNS_SERVERS
  })

  var tick = 0
  var id = typeof args.doctor === 'string' ? args.doctor : crypto.randomBytes(32).toString('hex')
  var sw = swarm({
    dns: {
      servers: dat.DNS_SERVERS
    }
  })

  sw.on('error', function () {
    sw.listen(0)
  })
  sw.listen(typeof args.port === 'number' ? args.port : 3282)
  sw.on('listening', function () {
    client.whoami(function (err, me) {
      if (err) return console.error('Could not detect public ip / port')
      console.log('Public IP: ' + me.host)
      console.log('Your public port was ' + (me.port ? 'consistent' : 'inconsistent') + ' across remote multiple hosts')
      if (!me.port) console.log('Looks like you are behind a symmetric nat. Try enabling upnp.')
      else console.log('Looks like you can accept incoming p2p connections.')
      client.destroy()
      sw.join(id)
      sw.on('connecting', function (peer) {
        console.log('[info] Trying to connect to %s:%d', peer.host, peer.port)
      })
      sw.on('peer', function (peer) {
        console.log('[info] Discovered %s:%d', peer.host, peer.port)
      })
      sw.on('connection', function (connection) {
        var num = tick++
        var prefix = '0000'.slice(0, -num.toString().length) + num

        var data = crypto.randomBytes(16).toString('hex')
        console.log('[%s] Connection established to remote peer', prefix)
        var buf = ''
        connection.setEncoding('utf-8')
        connection.write(data)
        connection.on('data', function (remote) {
          buf += remote
          if (buf.length === data.length) {
            console.log('[%s] Remote peer echoed expected data back', prefix)
          }
        })
        pump(connection, connection, function () {
          console.log('[%s] Connected closed', prefix)
        })
      })

      console.log('')
      console.log('To test p2p connectivity login to another computer and run:')
      console.log('')
      console.log('  dat --doctor=' + id)
      console.log('')
      console.log('Waiting for incoming connections... (local port: %d)', sw.address().port)
      console.log('')
    })
  })
}

function runCommand (loc) {
  if (args.doctor) return runDoctor()
  if (!cmd) return usage('root.txt')

  var db = dat({home: args.home})

  if (cmd === 'link') link(loc, db)
  else if (cmd === 'list') list(loc, db)
  else if (cmd) download(loc, db)
}

function link (loc, db) {
  var dirs = args._.slice(1)
  if (dirs.length === 1 && dirs[0].match(/^dat:/)) {
    console.error('Do you mean `dat ' + dirs[0] + '` ?')
    process.exit(1)
  }

  if (dirs.length === 0) dirs = loc
  for (var i = 0; i < dirs.length; i++) {
    var dir = dirs[i]
    if (dir === '.') dirs[i] = loc
  }

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
        stats.swarm = swarm
        swarm.sharingLink = true
        startProgressLogging(stats)
      })
    })
    stats = xtend(stats, statsProgress)

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
  var opts = {}
  var parts = hash.split(':')
  hash = parts[0]
  if (parts.length > 1) {
    var selections = parts[parts.length - 1].split(',')
    opts.files = []
    for (var i = 0; i < selections.length; i++) opts.files.push(selections[i])
  }
  if (hash.length !== 64) {
    logger.error('Error: Invalid dat link\n')
    return usage('root.txt')
  }
  var downloadStats = db.download(hash, loc, opts, function (err, swarm) {
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
}

function printScanProgress (stats, opts) {
  if (!opts) opts = {}
  var statusText = chalk.bold.blue('Calculating Size')
  if (opts.done) statusText = 'Creating Dat Link'
  var msg = getScanOutput(stats, statusText)
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
  } else {
    printFileProgress(stats, {message: 'Adding Files to Dat'})
  }
}

function printSwarmStatus (stats) {
  var swarm = stats.swarm
  if (!swarm) return logger.stdout('Finding data sources...\n')

  if (swarm.hasMetadata && swarm.gettingMetadata) {
    // Print final metadata output
    var scanMsg = ''
    swarm.gettingMetadata = false
    scanMsg = getScanOutput(stats, 'Downloading Data')
    logger.stdout(scanMsg)
    logger.log('')
  }

  var msg = ''
  if (swarm.downloading) msg = downloadMsg()
  if (swarm.sharingLink && !swarm.printedSharingLink) {
    msg += chalk.bold('[Sharing] ')
    msg += chalk.underline.blue('dat://' + swarm.link + '\n')
    logger.log(msg)
    msg = ''
    swarm.printedSharingLink = true
  }
  if (swarm.downloadComplete && !swarm.printedDownloadComplete) {
    msg = downloadCompleteMsg()
    logger.log(msg)
    msg = ''
    swarm.printedDownloadComplete = true
  }
  if (swarm.downloading && !swarm.downloadComplete) {
    msg += chalk.bold('[Downloading] ')
    msg += chalk.underline.blue('dat://' + swarm.link + '\n')
  }

  var count = '0'
  var activePeers = swarm.connections.length
  var totalPeers = swarm.connecting + swarm.connections.length
  if (activePeers > 0) count = activePeers + '/' + totalPeers
  msg += chalk.bold('[Status] ') + 'Connected to ' + chalk.bold(count) + ' sources'

  if (stats.uploaded.bytesRead > 0) {
    msg += '\n'
    msg += chalk.bold('[Uploaded] ') + prettyBytes(stats.uploaded.bytesRead)
    msg += ' at ' + prettyBytes(stats.uploadRate()) + '/s'
  }
  logger.stdout(msg + '\n')

  function downloadMsg () {
    if (!stats.total.bytesTotal) return chalk.bold('Connecting...\n')
    if (swarm.gettingMetadata && !swarm.hasMetadata) {
      return getScanOutput(stats, chalk.bold.blue('Getting Metadata')) + '\n'
    }
    return printFileProgress(stats, {
      returnMsg: true, message: 'Downloading Data'
    })
  }

  function downloadCompleteMsg () {
    var outMsg = printFileProgress(stats, {
      returnMsg: true, showFilesOnly: true
    })
    outMsg += chalk.bold.green('[Done] ')
    outMsg += chalk.bold(
      'Downloaded ' + prettyBytes(stats.progress.bytesRead) + ' '
    )
    if (stats.parentFolder) outMsg += chalk.bold('to ') + chalk.bold(stats.parentFolder)
    outMsg += '\n'
    outMsg += chalk.bold('[Sharing] ')
    outMsg += chalk.underline.blue('dat://' + swarm.link)
    return outMsg
  }
}

function getScanOutput (stats, statusMsg) {
  if (!statusMsg) statusMsg = chalk.bold.green('Scan Progress')
  var dirCount = stats.total.directories + 1 // parent folder
  return statusMsg + ' ' + chalk.bold(
    '(' + stats.total.filesTotal + ' files, ' + dirCount + ' folders, ' +
    (stats.total.bytesTotal ? prettyBytes(stats.total.bytesTotal) + ' total' : '') + ')'
  )
}

function printFileProgress (stats, opts) {
  if (!opts) opts = {}
  var totalMsg = opts.message || 'File Progress'
  var msg = ''

  while (true) {
    if (stats.fileQueue.length === 0) break
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
    statusText + ': ' + fileProgress + ' of ' + stats.total.filesTotal +
    chalk.dim(
      ' (' + prettyBytes(bytesProgress) +
      ' of ' + prettyBytes(stats.total.bytesTotal) + ') '
    )
  )
  if (stats.downloadRate) msg += chalk.dim(prettyBytes(stats.downloadRate()) + '/s ')
  msg += '\n'
  return msg
}
