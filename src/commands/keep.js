var Dat = require('dat-node')
var createBackup = require('dat-backup')
var neatLog = require('neat-log')
var keepUI = require('../ui/keep')
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
      help: 'List all files in local storage.'
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

      var backup = createBackup(dat) // , {serve: opts.serve, list: opts.list})
      backup.create(function (err) {
        if (err) throw new Error(err)

        if (opts.list) {
          var stream = backup.list()
          stream.on('data', function (data) {
            console.log(data.name, new Date(data.value.mtime).toLocaleString(), '(version:', data.version, ')')
          })
          stream.on('error', function (err) {
            console.error('err', err)
          })
        } else {
          if (opts.tag) {
            // TODO: save tag to ndjson file/hypercore?
            // version is archive version, everything else optional
            // {version: 23, name: 'v1.1.1', description: 'asfd', whatever: 'cat'}
          }

          if (dat.writable && opts.import) return importKeep()
          backup.add({live: opts.live})
        }
      })

      function importKeep () {
        // Import and then keep
        state.importing = true
        dat.importFiles(function (err) {
          state.importing = false
          backup.add({live: opts.live}, function (err) {
            if (err) return bus.emit('exit:err', err)
            state.keep = true
            bus.emit('render')
          })
        })
        bus.emit('render')
      }
    })
  })
}
