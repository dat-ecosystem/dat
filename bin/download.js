var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var each = require('stream-each')
var raf = require('random-access-file')
var chalk = require('chalk')
var replicate = require('../lib/replicate')
var StatusLogger = require('../lib/statusLogger')
var swarmLogger = require('../lib/swarmLogger')

module.exports = function (argv) {
  var key = argv._[0]
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive(Buffer(key, 'hex'), {
    file: function (name) {
      return raf(name)
    }
  })

  var logger = StatusLogger(argv)

  logger.message(chalk.gray('Starting Download...'), 4)

  logger.status('', 0) // reserve line for file progress
  // logger.status(chalk.bold('[...]'), 1) // TODO: total progress and size
  logger.status(chalk.bold('[Downloading] ') + chalk.blue.underline(archive.key.toString('hex')), 1)
  logger.status(chalk.bold('[Status]'), 2)
  logger.status(chalk.blue('  Connecting...'), -1)

  swarmLogger(replicate(argv, archive), logger)

  each(archive.list({live: argv.live}), function (data, next) {
    // logger.status(chalk.blue('  Downloading Files...'), 3)
    logger.status('         ' + data.name, 0) // TODO: actual progress %
    archive.download(data, function (err) {
      if (err) return onerror(err)
      logger.message(chalk.green.dim('  [Done] ') + chalk.dim(data.name))
      logger.status('', 0) // clear file progress msg
      next()
    })
  }, function () {
    logger.status(chalk.green('[Download Completed] ') + chalk.blue.underline(archive.key.toString('hex')))
    logger.status('', -1) // remove peer count
    logger.logNow()
    process.exit(0)
  })

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
