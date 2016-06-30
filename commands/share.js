var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')
var logger = require('../lib/logger')
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

  dat.on('ready', function () {
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

  dat.on('key', function (key) {
    log.message(ui.keyMsg(key))
  })

  dat.on('file-added', printStats)
  dat.on('file-exists', printStats)

  dat.on('append-ready', printStats)

  dat.on('archive-finalized', function () {
    addText = 'Added '
    initFileCount = dat.stats.filesTotal
    printStats()
  })

  dat.on('archive-updated', function () {
    addText = 'Updated '
    updated = true
    printStats()
  })

  dat.on('connecting', function () {
    var msg = 'Waiting for connections. '
    if (dat.archive.live) msg += 'Watching for updates...'
    log.status(msg, 1)
  })

  dat.on('swarm-update', printSwarm)
  dat.on('upload', printSwarm)

  function printSwarm () {
    log.status(ui.swarmMsg(dat), 1)
  }

  function printStats (data) {
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
