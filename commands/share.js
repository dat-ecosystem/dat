var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')
var logger = require('status-logger')
var ui = require('../lib/ui')

module.exports = function (args) {
  var dat = Dat(args)
  var log = logger(args)

  var addText = 'Adding '
  var updated = false
  var initFileCount = 0

  log.status('Starting Dat...\n', 0)
  if (args.snapshot) log.status('Creating Link...', 1)
  else log.status('Connecting...', 1)

  dat.on('error', onerror)

  dat.once('ready', function () {
    log.message('Sharing ' + dat.dir + '\n')
    dat.share(function (err) {
      if (err) onerror(err)
    })
  })

  dat.on('file-counted', function () {
    var msg = 'Calculating Size: '
    msg += dat.appendStats.files + ' files '
    msg += chalk.dim('(' + prettyBytes(dat.appendStats.bytes) + ')')
    log.status(msg + '\n', 0)
  })

  dat.once('key', function (key) {
    log.message(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.on('file-added', updateStats)
  dat.on('file-exists', updateStats)

  dat.once('append-ready', updateStats)

  dat.once('archive-finalized', function () {
    addText = 'Added '
    initFileCount = dat.stats.filesTotal
    updateStats()
  })

  dat.on('archive-updated', function () {
    addText = 'Updated '
    updated = true
    updateStats()
  })

  dat.on('swarm-update', printSwarm)

  setInterval(function () {
    printSwarm()
    log.print()
    // console.log('here', log)
  }, args.logspeed)
  log.print()

  function printSwarm () {
    log.status(ui.swarmMsg(dat), 1)
  }

  function updateStats (data) {
    var stats = dat.stats
    var files = stats.filesTotal
    var bytesTotal = dat.appendStats.bytes
    var bytesProgress = stats.bytesTotal
    if (updated) {
      files = files - initFileCount
      bytesProgress = stats.bytesTotal // TODO: update progress for live
      bytesTotal = stats.bytesTotal
    }

    var msg = ui.progress(bytesProgress / bytesTotal)
    msg += ' ' + addText + chalk.bold(files) + ' files'
    msg += chalk.dim(' (' + prettyBytes(bytesProgress) + '/' + prettyBytes(bytesTotal) + ')')
    log.status(msg + '\n', 0)
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
