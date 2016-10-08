var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('dat-js')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (args) {
  if (args.temp) args.db = require('memdb')()
  var dat = Dat(args)

  var messages = []
  var progressLines = []
  var log = logger([messages, progressLines], {debug: args.debug, quiet: args.quiet})

  var addText = 'Adding '
  var updated = false
  var initFileCount = 0

  dat.stats.rateUp = speedometer()

  progressLines[0] = 'Starting Dat...\n'
  if (args.snapshot) progressLines[1] = 'Creating Link...'
  else progressLines[1] = 'Connecting...'

  dat.on('error', onerror)

  dat.open(function () {
    messages.push('Sharing ' + dat.dir + '\n')
    dat.share(function (err) {
      if (err) onerror(err)
    })

    setInterval(function () {
      printSwarm()
      log.print()
    }, args.logspeed)
    log.print()
  })

  dat.on('upload', function (data) {
    dat.stats.rateUp(data.length)
  })

  dat.on('file-counted', function (stats) {
    var msg = 'Calculating Size: '
    msg += stats.filesTotal + ' items '
    msg += chalk.dim('(' + prettyBytes(stats.bytesTotal) + ')')
    progressLines[0] = msg + '\n'
  })

  dat.once('key', function (key) {
    messages.push(ui.keyMsg(key))
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
    progressLines[1] = ui.swarmMsg(dat)
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
    progressLines[0] = msg + '\n'
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
