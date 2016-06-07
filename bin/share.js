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
  logger.status('Starting')

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
      logger.message('Reading Files...')
      logger.status('Creating Dat: ' + archive.key.toString('hex'))
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

    logger.message('Adding: ' + data.relname)
    archive.append({type: data.type, name: data.relname}, next)
  }

  function done (err) {
    if (err) return onerror(err)

    archive.finalize(function (err) {
      if (err) return onerror(err)

      logger.message(chalk.green('All files added'))
      var completedMsg = 'Dat Completed ' + chalk.blue.underline(archive.key.toString('hex'))
      logger.status(completedMsg, 1)

      if (!archive.live) {
        replicate()
        return
      }

      var dirName = dir === '.' ? process.cwd() : dir
      logger.status('Watching ' + dirName + ' ...', 2)

      yoloWatch(dir, function (name, st) {
        logger.message('Adding: ' + name)
        archive.append({type: st.isDirectory() ? 'directory' : 'file', name: name})
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
