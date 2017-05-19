var Dat = require('dat-node')
var createBackup = require('dat-backup')
var neatLog = require('neat-log')
var keepUI = require('../ui/keep')
var trackImport = require('../lib/import-progress')
var onExit = require('../lib/exit')
var debug = require('debug')('dat')

module.exports = {
  name: 'keep',
  command: keepCommand,
  help: [
    'keep a Dat archive with the network',
    'Watch and import file changes (if you created the archive)',
    '',
    'Usage: dat keep'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: true,
      help: 'Import files from the directory before putting in storage.'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: false,
      abbr: 'ignore-hidden'
    },
    {
      name: 'list',
      boolean: true,
      default: false,
      abbr: 'l',
      help: 'List all files in local backup.'
    },
    {
      name: 'remove',
      abbr: 'd',
      default: false,
      help: 'Remove local backups, specify single version -d 12 or a version range -d 22..54'
    },
    {
      name: 'serve',
      boolean: true,
      default: false,
      abbr: 's',
      help: 'Serve archive from backups.'
    }
  ]
}

function keepCommand (opts) {
  debug('dat keep')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  // Force options
  opts.createIfMissing = false // keep must always be a resumed archive

  var neat = neatLog(keepUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'MissingError') return bus.emit('exit:warn', 'No existing archive in this directory.')
      if (err) return bus.emit('exit:error', err)

      state.dat = dat
      bus.emit('dat')
      bus.emit('render')

      var backup = createBackup(dat)
      state.backup = Object.assign({
        ready: false
      }, backup)

      backup.ready(function (err) {
        if (err) return bus.emit('exit:error', err)
        state.backup.ready = true

        if (opts.list) {
          if (backup.dat.archive.version < 1) {
            return bus.emit('exit:warn', 'No data in local backup. Use `dat keep` to backup data.')
          }
          state.backup.list = []
          var stream = backup.list()
          stream.on('data', function (data) {
            state.backup.list.push(data)
            bus.emit('render')
          })
          stream.on('end', function () {
            state.exiting = true
            bus.emit('render')
          })
          stream.on('error', function (err) {
            bus.emit('exit:error', err)
          })
        } else if (opts.remove) {
          var start = {}
          var end = {}
          if (typeof opts.remove === 'string') {
            // remove range
            start.version = +opts.remove.split('..')[0]
            end.version = +opts.remove.split('..')[1]
          } else {
            // remove single version
            start.version = opts.remove
          }
          state.backup.removeRange = [start.version]
          if (end.version) state.backup.removeRange.push(end.version)
          state.backup.remove(start, end, function (err) {
            if (err) return bus.emit('exit:error')
            state.exiting = true
            bus.emit('render')
          })
        } else if (opts.serve) {
          if (backup.dat.archive.version < 1) {
            return bus.emit('exit:warn', 'No data in local backup. Use `dat keep` to backup data.')
          }
          backup.serve()
          bus.emit('render')
        } else {
          state.backup.running = true
          bus.emit('render')
          if (dat.writable && opts.import) return importKeep()
          backup.add(function (err) {
            if (err) return bus.emit('exit:error', err)
            state.exiting = true
            bus.emit('render')
          })
        }
      })

      function importKeep () {
        // Import and then keep
        neat.use(trackImport)
        if (state.importer.finished) return doBackup()
        bus.once('import:finished', doBackup)

        function doBackup () {
          backup.add(function (err) {
            if (err) return bus.emit('exit:err', err)
            state.backup.running = false
            state.exiting = true
            bus.render()
          })
        }
      }
    })
  })
}
