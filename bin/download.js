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
  logger.status('Connecting...')

  swarmLogger(replicate(argv, archive), logger)

  each(archive.list({live: argv.live}), function (data, next) {
    logger.status('Downloading')
    logger.message('Downloading ' + data.name)
    archive.download(data, function (err) {
      if (err) return onerror(err)
      logger.message('Download of ' + data.name + ' finished')
      next()
    })
  }, function () {
    logger.logNow(chalk.green('Download Completed.'))
    process.exit(0)
  })

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
