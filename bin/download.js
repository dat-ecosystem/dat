var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var each = require('stream-each')
var raf = require('random-access-file')
var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var speedometer = require('speedometer')
var replicate = require('../lib/replicate')
var statusLogger = require('../lib/status-logger')
var swarmLogger = require('../lib/swarm-logger')

module.exports = function (argv) {
  var key = argv._[0]
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive(Buffer(key, 'hex'), {
    file: function (name) {
      return raf(name)
    }
  })
  var noDataTimeout = null
  var stats = {
    filesTotal: 0,
    bytesTotal: 0,
    filesTransferred: 0,
    bytesTransferred: 0,
    transferRate: speedometer()
  }
  var logger = statusLogger(argv)

  logger.message(chalk.gray('Starting Dat: ') + chalk.blue.underline(archive.key.toString('hex')) + '\n')

  logger.status(chalk.gray('Getting Information...'), 0) // reserve line for file progress
  logger.status(chalk.bold(''), 1) // TODO: total progress and size
  logger.status(chalk.bold('[Joining] ') + chalk.blue.underline(archive.key.toString('hex')), 2)
  logger.status(chalk.bold('[Status]'), 3)
  logger.status(chalk.blue('  Looking for Peers...'), -1)

  var swarm = replicate(argv, archive)
  swarmLogger(swarm, logger)

  archive.on('download', function (data) {
    if (noDataTimeout) clearInterval(noDataTimeout)
    stats.bytesTransferred += data.length
    stats.transferRate(data.length)
    logger.status(chalk.bold('[Downloading] ') + chalk.blue.underline(archive.key.toString('hex')), 2)
    logger.status(chalk.blue('  Downloading ' + prettyBytes(stats.transferRate()) + '/s'), 4)
    printTotalStats()
    noDataTimeout = setInterval(function () {
      logger.status(chalk.blue('  Waiting for Data...'), 4)
    }, 1000)
  })

  each(archive.list({live: argv.live}), function (data, next) {
    printTotalStats()
    if (stats.bytesTransferred === 0) {
      logger.status('  Getting Metadata...', 0) // HACK
    } else {
      logger.status('         ' + data.name, 0) // TODO: actual progress %
    }
    archive.download(data, function (err) {
      if (err) return onerror(err)
      logger.message(chalk.green.dim('  [Done] ') + chalk.dim(data.name))
      logger.status('', 0) // clear file progress msg
      stats.filesTransferred += 1
      printTotalStats()
      next()
    })
  }, function () {
    logger.status(chalk.bold('[Downloaded] ') + chalk.blue.underline(archive.key.toString('hex')))
    logger.status('', -1) // remove peer count
    printTotalStats()
    logger.logNow()
    process.exit(0)
  })

  function printTotalStats () {
    stats.filesTotal = archive.metadata.blocks - 1 // first block is header
    stats.bytesTotal = archive.content.bytes
    var totalPer = Math.floor(100 * (stats.bytesTransferred / stats.bytesTotal))
    var msg = ''
    if (totalPer === 100) msg += chalk.bold.green('[Done] ')
    else if (totalPer >= 0) msg += chalk.bold('[' + ('  ' + totalPer).slice(-3) + '%] ')
    else msg += '        '
    msg += stats.filesTransferred + ' of ' + stats.filesTotal + ' files'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesTransferred) + ' of ')
    msg += chalk.dim(prettyBytes(stats.bytesTotal) + ') ')
    logger.status(msg, 1)
  }

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
