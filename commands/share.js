var chalk = require('chalk')
var download = require('./download')
var prettyBytes = require('pretty-bytes')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (dat, args) {
  var log = logger(args)
  var addText = 'Adding '
  var updated = false
  var initFileCount = 0

  dat.stats.rateUp = speedometer()

  log.status('Starting Dat...\n', 0)
  if (args.snapshot) log.status('Creating Link...', 1)
  else log.status('Connecting...', 1)

  dat.on('error', onerror)

  dat.open(function () {
    dat.archive.open(function () {
      if (dat.archive.key && !dat.archive.owner) return download(dat, args)
      log.message('Sharing ' + dat.dir + '\n')
      dat.share(function (err) {
        if (err) onerror(err)
      })

      setInterval(function () {
        printSwarm()
        log.print()
      }, args.logspeed)
      log.print()
    })
  })

  dat.on('upload', function (data) {
    dat.stats.rateUp(data.length)
  })

  dat.on('file-counted', function (stats) {
    var msg = 'Calculating Size: '
    msg += stats.filesTotal + ' items '
    msg += chalk.dim('(' + prettyBytes(stats.bytesTotal) + ')')
    log.status(msg + '\n', 0)
  })

  dat.once('key', function (key) {
    log.message(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.once('files-counted', function (stats) {
    // async file counting + appending
    // wait until all counting is done to print append status
    dat.on('file-added', updateStats)
    dat.on('file-exists', updateStats)
  })

  dat.once('archive-finalized', function () {
    addText = 'Added '
    initFileCount = dat.stats.filesTotal
    updateStats()
  })

  dat.on('archive-updated', function () {
    addText = 'Updating '
    updated = true
    updateStats()
  })

  dat.on('swarm-update', printSwarm)

  function printSwarm () {
    log.status(ui.swarmMsg(dat), 1)
  }

  function updateStats () {
    var stats = dat.stats
    var files = stats.filesTotal
    var bytesTotal = stats.bytesTotal
    var bytesProgress = stats.bytesProgress

    if (dat.live && updated) {
      if (stats.filesTotal === stats.filesProgress) addText = 'Updated '
      files = files - initFileCount
      bytesTotal = stats.bytesTotal
    }

    var msg = ui.progress(bytesProgress / bytesTotal)
    msg += ' ' + addText + chalk.bold(files) + ' items'
    msg += chalk.dim(' (' + prettyBytes(bytesProgress) + '/' + prettyBytes(bytesTotal) + ')')
    log.status(msg + '\n', 0)
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
