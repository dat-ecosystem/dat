var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (dat, args) {
  var lines = [[], []]
  var log = logger(lines, {debug: args.debug, quiet: args.quiet})
  var messages = lines[0] = []
  var progress = lines[1] = []

  var downloadTxt = 'Downloading '
  var finished = false

  dat.stats.rateUp = speedometer()
  dat.stats.rateDown = speedometer()

  progress.push('Starting Dat...\n')
  progress.push('Connecting...')

  dat.on('error', onerror)

  dat.open(function (err) {
    if (err) return onerror(err)
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
    progress[2] = '' // remove download finished message
  })
  dat.on('file-downloaded', updateStats)

  dat.on('download-finished', function () {
    finished = true
    dat.stats.rateDown = 0
    updateStats()
    if (args.exit) {
      progress[1] = '' // clear swarm info before exiting
      process.exit(0)
    }
    progress[2] = '\nDownload Finished. You may exit the process with Ctrl-C.'
  })

  dat.on('swarm-update', printSwarm)

  function printSwarm () {
    progress[1] = ui.swarmMsg(dat)
  }

  function updateStats () {
    var stats = dat.stats
    var msg = ui.progress(stats.blocksProgress / stats.blocksTotal)
    if (finished || stats.blocksProgress >= stats.blocksTotal) {
      downloadTxt = 'Downloaded '
    }
    msg += ' ' + downloadTxt + chalk.bold(stats.filesTotal) + ' items'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesTotal) + ')')
    progress[0] = msg + '\n'
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
