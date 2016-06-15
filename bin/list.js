var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var each = require('stream-each')
var raf = require('random-access-file')
var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
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
  var firstFile = true
  var stats = {
    filesTotal: 0,
    bytesTotal: 0,
    filesTransferred: 0
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

  each(archive.list({live: argv.live}), function (data, next) {
    if (firstFile) {
      firstFile = false
      logger.status('', 0)
      logger.status(chalk.bold('[Listing Files] ') + chalk.blue.underline(archive.key.toString('hex')), 2)
    }
    if (data.type === 'file') {
      var msg = '  ' + data.name
      msg += ' ' + chalk.dim('(' + prettyBytes(data.length) + ')')
      logger.message(msg)
    }
    stats.filesTransferred += 1
    printTotalStats()
    next()
  }, function () {
    logger.status(chalk.bold('[Files Listed] ') + chalk.blue.underline(archive.key.toString('hex')))
    logger.status('', -1) // remove peer count
    printTotalStats()
    logger.logNow()
    process.exit(0)
  })

  function printTotalStats () {
    stats.filesTotal = archive.metadata.blocks - 1 // first block is header
    stats.bytesTotal = archive.content.bytes
    var totalPer = Math.floor(100 * (stats.filesTransferred / stats.filesTotal))
    var msg = ''
    if (totalPer === 100) msg += chalk.bold.green('[Done] ')
    else if (totalPer >= 0) msg += chalk.bold('[' + ('  ' + totalPer).slice(-3) + '%] ')
    else msg += '        '
    msg += stats.filesTransferred
    if (totalPer !== 100) msg += ' of ' + stats.filesTotal
    msg += ' files'
    msg += chalk.dim(' (' + prettyBytes(stats.bytesTotal) + ') ')
    logger.status(msg, 1)
  }
}
