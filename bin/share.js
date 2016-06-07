var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var walker = require('folder-walker')
var each = require('stream-each')
var raf = require('random-access-file')
var fs = require('fs')
var path = require('path')
var chalk = require('chalk')
var replicate = require('../lib/replicate')
var StatusLogger = require('../lib/statusLogger')
var swarmLogger = require('../lib/swarmLogger')

module.exports = function (argv) {
  var drive = hyperdrive(memdb()) // TODO: use level instead
  var dir = argv._[1] || '.'
  var firstAppend = true

  try {
    var isDirectory = fs.statSync(dir).isDirectory()
  } catch (err) {
    console.error('Directory does not exist')
    process.exit(1)
  }

  var logger = StatusLogger(argv)
  logger.message(chalk.gray('Creating Dat...'))

  var archive = drive.createArchive(argv.resume, {
    live: !argv.static,
    file: function (name) {
      return raf(isDirectory ? path.join(dir, name) : dir, {readable: true, writable: false})
    }
  })

  archive.open(function (err) {
    if (err) return onerror(err)
    if (argv.resume && !archive.owner) return onerror('You cannot resume this link')

    if (archive.live || archive.owner) {
      logger.status('', 0) // reserve line for file progress
      logger.status(chalk.bold('[...]'), 1) // TODO: total progress and size
      logger.status(chalk.bold('Dat Link ') + chalk.blue.underline(archive.key.toString('hex')), 2)
      logger.status(chalk.bold('[Status]'), 3)
      logger.status(chalk.blue('  Reading Files...'), 4)
      var swarm = replicate(argv, archive)
      swarmLogger(swarm, logger)
    }

    each(walker(dir), appendEntry, done)
  })

  // archive.list({live: true}).on('data', logger.message)

  function appendEntry (data, next) {
    if (isDirectory && firstAppend) {
      firstAppend = false // folder walker seems off on the first item. TODO: investigate
      return next()
    }

    logger.status('         ' + data.relname, 0) // TODO: actual progress %
    archive.append({type: data.type, name: data.relname}, function () {
      logger.message(chalk.green.dim('  [Done] ') + chalk.dim(data.relname))
      logger.status('', 0) // clear file progress msg
      next()
    })
  }

  function done (err) {
    if (err) return onerror(err)

    archive.finalize(function (err) {
      if (err) return onerror(err)

      if (!archive.live) {
        replicate()
        return
      }

      var dirName = dir === '.' ? process.cwd() : dir
      logger.status(chalk.blue('  Watching ' + chalk.bold(dirName) + ' ...'), 3)

      yoloWatch(dir, function (name, st) {
        logger.status('         ' + name, 0)
        archive.append({type: st.isDirectory() ? 'directory' : 'file', name: name}, function () {
          logger.message(chalk.green.dim('  [Done] ') + chalk.dim(name))
          logger.status('', 0)
        })
      })
    })
  }

  function onerror (err) {
    console.error(err.stack || err)
    process.exit(1)
  }

  function yoloWatch (dir, onchange) {
    var stats = {}

    kick(true, function () {
      fs.watch(dir, function () {
        kick(false, function () {})
      })
    })

    function kick (first, cb) {
      fs.readdir(dir, function (err, files) {
        if (err) return

        loop()

        function loop () {
          var file = files.shift()
          if (!file) return cb()

          fs.stat(path.join(dir, file), function (err, st) {
            if (err) return loop()

            if (!stats[file] || st.nlink !== stats[file].nlink) {
              stats[file] = st
              if (!first) onchange(file, st)
            }

            loop()
          })
        }
      })
    }
  }
}
