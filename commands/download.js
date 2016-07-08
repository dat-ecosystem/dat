var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')
var logger = require('status-logger')
var ui = require('../lib/ui')

module.exports = function (args) {
  var dat = Dat(args)
  var log = logger(args)

  var downloadTxt = 'Downloading '
  var swarmTimeout = null

  log.status('Starting Dat...\n', 0)
  log.status('Connecting...', 1)

  dat.on('error', onerror)

  dat.once('ready', function () {
    log.message('Downloading in ' + dat.dir + '\n')
    dat.download(function (err) {
      if (err) onerror(err)
    })
  })

  dat.once('key', function (key) {
    log.message(ui.keyMsg(key))
    if (args.quiet) console.log(ui.keyMsg(key))
  })

  dat.on('download', function (data) {
    downloadTxt = 'Downloading '
    updateStats()
  })

  dat.on('download-finished', function () {
    downloadTxt = 'Downloaded '
    updateStats()
    if (args.exit) {
      log.status('', 1)
      process.exit(0)
    }
  })

  dat.once('connecting', function () {
    var msg = 'Waiting for connections. '
    if (dat.archive.live) msg += 'Watching for updates...'
    log.status(msg, 1)
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
    var msg = ui.progress(stats.bytesDown / stats.bytesTotal)
    msg += ' ' + downloadTxt + chalk.bold(stats.filesTotal) + ' files'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesDown) + '/' + prettyBytes(stats.bytesTotal) + ')')
    log.status(msg + '\n', 0)
  }
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
