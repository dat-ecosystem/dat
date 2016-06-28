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
  log.status('Connecting...', 1)

  dat.on('ready', function () {
    log.message('Initializing Dat in ' + dat.dir + '\n')
    dat.share(function (err) {
      if (err) onerror(err)
    })
  })

  dat.on('key', function (key) {
    var msg = 'Share Link: ' + chalk.blue.underline(key) + '\n'
    msg += 'The Share Link is secret and only those you share it with will be able to get the files'
    log.message(msg + '\n')
  })

  dat.on('file-added', printStats)
  dat.on('file-exists', printStats)

  dat.on('append-ready', function () {
    printStats()
  })

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
    var msg = 'Connected to ' + dat.swarm.connections + ' peers. '
    msg += 'Uploading ' + prettyBytes(dat.stats.rateUp()) + '/s. '
    if (dat.archive.live) msg += 'Watching for updates...'
    log.status(msg, 1)
  }

  function printStats (data) {
    var stats = dat.stats
    var files = stats.filesTotal
    if (updated) files = files - initFileCount
    var msg = ui.progress(stats.bytesTotal / dat.appendStats.bytes)
    msg += ' ' + addText + chalk.bold(files) + ' files'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesTotal) + '/' + prettyBytes(dat.appendStats.bytes) + ')')
    log.status(msg + '\n', 0)
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
