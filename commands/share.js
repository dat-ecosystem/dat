var chalk = require('chalk')
var download = require('./download')
var prettyBytes = require('pretty-bytes')
var logger = require('status-logger')
var speedometer = require('speedometer')
var ui = require('../lib/ui')

module.exports = function (dat, args) {
  var lines = [[], []]
  var log = logger(lines, {debug: args.debug, quiet: args.quiet})
  var messages = lines[0] = []
  var progress = lines[1] = []

  var addText = 'Adding '
  var finalized = false

  dat.stats.rateUp = speedometer()

  progress.push('Starting Dat...\n')
  if (args.snapshot) progress.push('Creating Link...')
  else progress.push('Connecting...')

  dat.on('error', onerror)

  dat.open(function (err) {
    if (err) return onerror(err)
    dat.archive.open(function () {
      if (dat.archive.key && !dat.archive.owner) return download(dat, args)
      messages.push('Sharing ' + dat.dir + '\n')
      dat.share(function (err) {
        if (err) onerror(err)
      })
      updateStats() // Update initial stats for resume

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
    progress[0] = msg + '\n'
  })

  dat.once('key', function (key) {
    messages.push(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.once('files-counted', function (stats) {
    // async file counting + appending
    // wait until all counting is done to print append status
    updateStats()
    dat.on('file-added', updateStats)
    dat.on('file-exists', updateStats)
  })

  dat.once('archive-finalized', function () {
    addText = 'Sharing '
    finalized = true
    updateStats()
  })

  dat.on('archive-updated', function () {
    updateStats()
  })

  dat.on('swarm-update', printSwarm)

  function printSwarm () {
    progress[1] = ui.swarmMsg(dat)
  }

  function updateStats () {
    var stats = dat.stats
    var files = stats.filesTotal
    var bytesTotal = stats.bytesTotal

    var msg = ui.progress(stats.bytesProgress / bytesTotal)
    msg += ' ' + addText
    if (finalized) msg += chalk.bold(files) + ' '
    msg += (files === 1) ? 'file' : 'files'
    msg += chalk.dim(' (' + prettyBytes(bytesTotal) + ')')
    progress[0] = msg + '\n'
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
