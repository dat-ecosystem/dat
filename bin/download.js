var hyperdrive = require('hyperdrive')
var each = require('stream-each')
var raf = require('random-access-file')
var path = require('path')
var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var speedometer = require('speedometer')
var createSwarm = require('hyperdrive-archive-swarm')
var statusLogger = require('../lib/status-logger')
var swarmLogger = require('../lib/swarm-logger')

module.exports = function (args) {
  var db = args.level
  var dir = args.dir
  var key = args.key ? args.key : args._[0]
  var pathName = dir === '.' ? process.cwd() : dir

  var noDataTimeout = null
  var stats = {
    filesTotal: 0,
    bytesTotal: 0,
    filesTransferred: 0,
    bytesTransferred: 0,
    transferRate: speedometer()
  }
  var logger = statusLogger(args)

  if (!dir) {
    // TODO: create folder with dat name here
    console.error('Please specify a directory.')
    process.exit(1)
  } else {
    downloadArchive()
  }

  function downloadArchive () {
    var drive = hyperdrive(db)
    var archive = drive.createArchive(Buffer(key, 'hex'), {
      file: function (name) {
        return raf(path.join(dir, name))
      }
    })

    logger.message('Initializing Dat from ' + chalk.blue.underline(archive.key.toString('hex')))

    logger.status('', 0) // total progress and size
    logger.status(printDatLink(archive.key), 1)
    logger.status('The Share Link is secret and only those you share it with will be able to get the files', 2)

    var swarm = createSwarm(archive, args)
    swarmLogger(swarm, logger, 'Downloading to ' + pathName)

    archive.on('download', function (data) {
      if (noDataTimeout) clearInterval(noDataTimeout)
      stats.bytesTransferred += data.length
      stats.transferRate(data.length)
      logger.status('Downloading ' + prettyBytes(stats.transferRate()) + '/s', -1)
      printTotalStats()
      noDataTimeout = setInterval(function () {
        logger.status(chalk.blue('Waiting for Data...'), -1)
      }, 1000)
    })

    archive.open(function (err) {
      if (err) return onerror(err)
      db.put('!dat!key', archive.key.toString('hex'))
      logger.status('', 0)

      each(archive.list({live: archive.live}), function (data, next) {
        var startBytes = stats.bytesTransferred
        printTotalStats()
        archive.download(data, function (err) {
          if (err) return onerror(err)
          var msg = chalk.green.dim('[DONE] ') + chalk.dim(data.name)
          if (data.type === 'file') msg += chalk.dim(' (' + prettyBytes(data.length) + ')')
          logger.message(msg)
          stats.filesTransferred += 1
          if (startBytes === stats.bytesTransferred) stats.bytesTransferred += data.length // file already exists
          printTotalStats()
          if (stats.filesTransferred === stats.filesTotal) done()
          else next()
        })
      }, done)
    })

    function done () {
      printTotalStats()

      if (args.exit) {
        if (archive.live) logger.status('Download Finished, Run Again to Update', 3)
        else logger.status('Download of Snapshot Finished', 3)
        logger.status('', -1) // remove peer count
        logger.logNow()
        process.exit(0)
      }

      logger.status('Download Finished, you may exit process', -1)
      if (archive.live) swarmLogger(swarm, logger, 'Syncing live updates')
      else swarmLogger(swarm, logger, 'Sharing data')
    }

    function printDatLink (key) {
      return chalk.bold('Share Link ') + chalk.blue.underline(key.toString('hex'))
    }

    function printTotalStats () {
      var msg = ''
      var totalPer = 0
      var done = (stats.bytesTransferred === stats.bytesTotal)

      stats.filesTotal = archive.metadata.blocks - 1 // first block is header
      stats.bytesTotal = archive.content.bytes
      totalPer = Math.floor(100 * (stats.bytesTransferred / stats.bytesTotal))

      if (done) msg += chalk.bold.green('[DONE] ')
      else msg += chalk.bold('[' + ('  ' + totalPer).slice(-3) + '%] ')

      if (done) {
        msg += stats.filesTransferred + ' items'
        msg += chalk.dim(' (' + prettyBytes(stats.bytesTransferred) + ')')
      } else {
        msg += stats.filesTransferred + ' of ' + stats.filesTotal + ' items'
        msg += chalk.dim(' (' + prettyBytes(stats.bytesTransferred) + ' of ')
        msg += chalk.dim(prettyBytes(stats.bytesTotal) + ')')
      }
      logger.status(msg, 0)
    }
  }

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
