var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('dat-js')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (args) {
  if (args && args.exit) args.upload = false
  if (args.temp) args.db = require('memdb')()
  var dat = Dat(args)

  var messages = []
  var progressLines = []
  var log = logger([messages, progressLines], {debug: args.debug, quiet: args.quiet})

  var downloadTxt = 'Downloading '
  var finished = false

  dat.stats.rateUp = speedometer()
  dat.stats.rateDown = speedometer()

  progressLines[0] = 'Starting Dat...\n'
  progressLines[1] = 'Connecting...'

  dat.on('error', onerror)

  dat.open(function () {
    messages.push('Downloading in ' + dat.dir + '\n')
    dat.download(function (err) {
      if (err) onerror(err)
    })

    setInterval(function () {
      printSwarm()
      log.print()
    }, args.logspeed)
    log.print()
  })

  dat.once('key', function (key) {
    messages.push(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.on('upload', function (data) {
    dat.stats.rateUp(data.length)
  })

  dat.on('download', function (data) {
    downloadTxt = 'Downloading '
    if (!finished) dat.stats.rateDown(data.length)
    updateStats()
  })

  dat.on('archive-updated', function () {
    finished = false
    dat.stats.rateDown = speedometer()
    updateStats()
    progressLines[2] = '' // remove download finished message
  })
  dat.on('file-downloaded', updateStats)

  dat.on('download-finished', function () {
    finished = true
    dat.stats.rateDown = 0
    updateStats()
    if (args.exit) {
      progressLines[1] = '' // clear swarm info before exiting
      process.exit(0)
    }
    progressLines[2] = '\nDownload Finished. You may exit the process with Ctrl-C.'
  })

  dat.on('swarm-update', printSwarm)

  function printSwarm () {
    progressLines[1] = ui.swarmMsg(dat)
  }

  function updateStats () {
    var stats = dat.stats
    var msg = ui.progress(stats.bytesProgress / stats.bytesTotal)
    if (finished || stats.filesProgress >= stats.filesTotal) {
      downloadTxt = 'Downloaded '
      msg = ui.progress(1) // hack to show completed with existing files
    }
    msg += ' ' + downloadTxt + chalk.bold(stats.filesTotal) + ' items'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesProgress) + '/' + prettyBytes(stats.bytesTotal) + ')')
    progressLines[0] = msg + '\n'
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
