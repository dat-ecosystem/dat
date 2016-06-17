var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var each = require('stream-each')
var raf = require('random-access-file')
var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var createSwarm = require('hyperdrive-archive-swarm')
var statusLogger = require('../lib/status-logger')
var swarmLogger = require('../lib/swarm-logger')

module.exports = function (args) {
  var key = args.key ? args.key : args._[0]
  var drive = hyperdrive(memdb())
  var archive = drive.createArchive(Buffer(key, 'hex'), {
    file: function (name) {
      return raf(name)
    }
  })
  var stats = {
    filesTotal: 0,
    bytesTotal: 0,
    filesTransferred: 0
  }
  var logger = statusLogger(args)

  logger.message('Initializing Dat from ' + chalk.blue.underline(archive.key.toString('hex')))

  logger.status('', 0) // total progress and size
  logger.status(printDatLink(archive.key), 1)
  logger.status('The Share Link is secret and only those you share it with will be able to get the files', 2)

  var swarm = createSwarm(archive, args)
  swarmLogger(swarm, logger, 'Getting File List')

  each(archive.list({live: args.live}), function (data, next) {
    var msg = data.name
    if (data.type === 'file') msg += ' ' + chalk.dim('(' + prettyBytes(data.length) + ')')
    logger.message(msg)
    stats.filesTransferred += 1
    printTotalStats()
    if (stats.filesTransferred === stats.filesTotal) done()
    else next()
  }, done)

  function done () {
    logger.status('') // remove messages
    printTotalStats()
    logger.status(printDatLink(archive.key), 1)
    logger.logNow()
    process.exit(0)
  }

  function printDatLink (key) {
    return chalk.bold('Share Link ') + chalk.blue.underline(key.toString('hex'))
  }

  function printTotalStats () {
    var msg = ''
    var totalPer = 0
    var done = (stats.filesTransferred === stats.filesTotal)

    stats.filesTotal = archive.metadata.blocks - 1 // first block is header
    stats.bytesTotal = archive.content.bytes
    totalPer = Math.floor(100 * (stats.filesTransferred / stats.filesTotal))

    if (done) msg += chalk.bold.green('[DONE] ')
    else msg += chalk.bold('[' + ('  ' + totalPer).slice(-3) + '%] ')

    if (done) {
      msg += stats.filesTransferred + ' items'
      msg += chalk.dim(' (' + prettyBytes(stats.bytesTotal) + ')')
    } else {
      msg += stats.filesTransferred + ' of ' + stats.filesTotal + ' items'
    }
    logger.status(msg, 0)
  }
}
