var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('dat-js')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (args) {
  var dat = Dat(args)
  var log = logger(args)

  var downloadTxt = 'Downloading '
  var finished = false

  dat.stats.rateUp = speedometer()
  dat.stats.rateDown = speedometer()

  log.status('Starting Dat...\n', 0)
  log.status('Connecting...', 1)

  dat.on('error', onerror)

  dat.open(function () {
    log.message('Downloading in ' + dat.dir + '\n')
    dat.download(function (err) {
      if (err) onerror(err)
    })
  })

  dat.once('key', function (key) {
    log.message(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.on('upload', function (data) {
    dat.stats.rateUp(data.length)
  })

  dat.on('download', function (data) {
    downloadTxt = 'Downloading '
    dat.stats.rateDown(data.length)
    updateStats()
  })

  dat.on('archive-updated', function () {
    finished = false
    updateStats()
  })
  dat.on('file-downloaded', updateStats)

  dat.on('download-finished', function () {
    finished = true
    updateStats()
    if (args.exit) {
      log.status('', 1)
      process.exit(0)
    }
    log.status('\nDownload Finished. You may exit the process with Ctrl-C.', -1)
  })

  dat.on('swarm-update', printSwarm)

  setInterval(function () {
    printSwarm()
    log.print()
  }, args.logspeed)
  log.print()

  function printSwarm () {
    log.status(ui.swarmMsg(dat), 1)
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
    log.status(msg + '\n', 0)
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
