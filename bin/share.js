var hyperdrive = require('hyperdrive')
var walker = require('folder-walker')
var each = require('stream-each')
var raf = require('random-access-file')
var path = require('path')
var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var speedometer = require('speedometer')
var createSwarm = require('hyperdrive-archive-swarm')
var yoloWatch = require('yolowatch')
var statusLogger = require('../lib/status-logger')
var swarmLogger = require('../lib/swarm-logger')

module.exports = function (args) {
  var db = args.level
  var dir = args.dir === '.' ? process.cwd() : args.dir
  var key = args.key ? Buffer(args.key, 'hex') : null
  var drive = hyperdrive(db)
  var swarm = null
  var logger = statusLogger(args)
  var noDataTimeout = null
  var stats = {
    filesTotal: 0,
    bytesTotal: 0,
    bytesTransferred: 0,
    transferRate: speedometer()
  }

  var archive = drive.createArchive(key, {
    name: path.basename(dir), // TODO: hyperdrive support for this
    live: !args.snapshot,
    file: function (name) {
      return raf(path.join(dir, name), {readable: true, writable: false})
    }
  })

  archive.open(function (err) {
    if (err) return onerror(err)
    if (key && !archive.owner) {
      logger.message('External Dat already exists in directory.')
      logger.message('Run ' + chalk.bold('dat ' + key.toString('hex')) + ' to update.')
      logger.logNow()
      process.exit(0)
    }

    logger.message('Initializing Dat in ' + dir)

    logger.status('', 0) // reserve total progress and size
    if (key) logger.status(printDatLink(archive.key), 1)
    else logger.status('Creating Share Link...', 1) // reserve for dat link
    logger.status('The Share Link is secret and only those you share it with will be able to get the files', 2)

    if ((archive.live || archive.owner) && archive.key) {
      if (!key) db.put('!dat!key', archive.key.toString('hex'))
      logger.status(printDatLink(archive.key), 1)
      swarm = createSwarm(archive, args)
      swarmLogger(swarm, logger, 'Sharing ' + dir)
    }

    archive.on('upload', function (data) {
      stats.bytesTransferred += data.length
      stats.transferRate(data.length)
      var msg = 'Uploading ' + prettyBytes(stats.transferRate()) + '/s'
      msg += ', ' + prettyBytes(stats.bytesTransferred) + ' Total'
      logger.status(msg, -1)
      if (noDataTimeout) clearInterval(noDataTimeout)
      noDataTimeout = setInterval(function () {
        var msg = 'Uploading ' + prettyBytes(stats.transferRate()) + '/s'
        msg += ', ' + prettyBytes(stats.bytesTransferred) + ' Total'
        logger.status(msg, -1)
      }, 100)
    })

    if (args.resume) {
      db.get('!dat!finalized', function (err, val) {
        if (err || val !== 'true') return walkFolder(true)
        else walkFolder(true) // TODO: check mtimes
      })
    } else {
      walkFolder()
    }
  })

  function ignore (filepath) {
    // TODO: split this out and make it composable/modular/optional/modifiable
    return filepath.indexOf('.dat') === -1 && filepath.indexOf('.swp') === -1
  }

  function walkFolder (resume) {
    var fileStream = walker(dir, {filter: ignore})
    if (resume) each(fileStream, checkAppend, done)
    else each(fileStream, appendEntry, done)
  }

  function checkAppend (data, next) {
    archive.lookup(data.relname, function (err, result) {
      if (!err && result) {
        var msg = chalk.green.dim('[DONE] ') + chalk.dim(result.name)
        if (data.type === 'file') msg += chalk.dim(' (' + prettyBytes(result.length) + ')')
        logger.message(msg)
        printTotalStats()
        return next()
      }
      appendEntry(data, next)
    })
  }

  function appendEntry (data, next) {
    if (ignore(data.filepath)) return next()
    archive.append({type: data.type, name: data.relname}, function () {
      var msg = chalk.green.dim('[DONE] ') + chalk.dim(data.relname)
      if (data.type === 'file') msg += chalk.dim(' (' + prettyBytes(data.stat.size) + ')')
      logger.message(msg)
      next()
      printTotalStats()
    })
  }

  function printDatLink (key) {
    return chalk.bold('Share Link ') + chalk.blue.underline(key.toString('hex'))
  }

  function printTotalStats () {
    stats.filesTotal = archive.metadata.blocks - 1 // first block is header
    stats.bytesTotal = archive.content ? archive.content.bytes : 0
    var msg = 'Items: ' + chalk.bold(stats.filesTotal)
    msg += '  Size: ' + chalk.bold(prettyBytes(stats.bytesTotal))
    logger.status(msg, 0)
  }

  function done (err) {
    if (err) return onerror(err)

    archive.finalize(function (err) {
      if (err) return onerror(err)
      db.put('!dat!finalized', true)

      if (args.snapshot) {
        logger.status(printDatLink(archive.key), 1)
        swarm = createSwarm(archive, args)
        swarmLogger(swarm, logger, 'Sharing Snapshot ' + dir)
        return
      }

      var watcher = yoloWatch(dir)
      watcher.on('changed', function (file) {
        appendEntry(file, function () {})
      })
    })
  }

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }
}
