var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var walker = require('folder-walker')
var each = require('stream-each')
var raf = require('random-access-file')
var fs = require('fs')
var path = require('path')
var replicate = require('../lib/replicate')

module.exports = function (argv) {
  var drive = hyperdrive(memdb()) // TODO: use level instead
  var dir = argv._[0] || '.'

  try {
    var isDirectory = fs.statSync(dir).isDirectory()
  } catch (err) {
    console.error('Directory does not exist')
    process.exit(1)
  }

  var archive = drive.createArchive(argv.append, {
    live: !argv.static,
    file: function (name) {
      return raf(isDirectory ? path.join(dir, name) : dir, {readable: true, writable: false})
    }
  })

  archive.open(function (err) {
    if (err) return onerror(err)
    if (argv.append && !archive.owner) return onerror('You cannot append to this link')

    if (archive.live || archive.owner) {
      console.log('Share this link:', archive.key.toString('hex'))
      onswarm(replicate(archive))
    }

    each(walker(dir), appendEntry, done)
  })

  // archive.list({live: true}).on('data', console.log)

  function appendEntry (data, next) {
    if (data.relname === '.') return next()

    console.log('Adding', data.relname)
    archive.append({type: data.type, name: data.relname}, next)
  }

  function onswarm (swarm) {
    swarm.on('connection', function (con) {
      console.log('Remote peer connected')
      con.on('close', function () {
        console.log('Remote peer disconnected')
      })
    })
    swarm.on('browser-connection', function (con) {
      console.log('WebRTC browser connected')
      con.on('close', function () {
        console.log('WebRTC browser disconnected')
      })
    })
  }

  function done (err) {
    if (err) return onerror(err)

    archive.finalize(function (err) {
      if (err) return onerror(err)

      console.log('All files added. Share this link:', archive.key.toString('hex'))

      if (!archive.live) {
        replicate()
        return
      }

      console.log('Watching', dir === '.' ? process.cwd() : '.', '...')

      yoloWatch(dir, function (name, st) {
        console.log('Adding', name)
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
