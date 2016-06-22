var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')
var logger = require('../lib/logger')

module.exports = function (args) {
  var dat = Dat(args)
  var log = logger(args)

  var downloadTxt = 'Downloading '

  log.status('Starting Dat...\n', 0)
  log.status('Connecting...', 1)

  dat.on('error', onerror)

  dat.on('ready', function () {
    log.message('Initializing Dat in ' + dat.dir + '\n')
    dat.download(function (err) {
      onerror(err)
    })
  })

  dat.on('key', function (key) {
    var msg = 'Share link: ' + chalk.blue.underline(key) + '\n'
    msg += 'The Share Link is secret and only those you share it with will be able to get the files'
    log.message(msg + '\n')
  })

  dat.on('download', function (data) {
    downloadTxt = 'Downloading '
    printStats()
    printSwarm()
  })

  dat.on('download-finished', function () {
    downloadTxt = 'Downloaded '
    printStats()
    printSwarm()
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
    msg += downloadTxt + prettyBytes(dat.stats.rateDown()) + '/s. '
    if (dat.stats.bytesUp) msg += 'Uploading ' + prettyBytes(dat.stats.rateUp()) + '/s. '
    log.status(msg, 1)
  }

  function printStats () {
    var stats = dat.stats
    var msg = progress(stats.bytesDown/stats.bytesTotal)
    msg += ' Downloading ' + chalk.bold(stats.filesTotal) + ' files'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesDown) + '/' + prettyBytes(stats.bytesTotal) + ')')
    log.status(msg + '\n', 0)
  }
}

function progress (percent) {
  var width = 15
  var cap = '>'
  var ends = ['[', ']']
  var spacer = Array(width).join(' ')
  var progressVal = ''
  var val = Math.round(percent * width)

  if (val > 0) {
    progressVal = Array(val).join('=')
    progressVal += cap
  }
  progressVal += spacer
  progressVal = progressVal.substring(0, width)

  return ends[0] + progressVal + ends[1]
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}