module.exports = {
  name: 'clone',
  command: clone,
  help: [
    'Clone a remote Dat archive',
    '',
    'Usage: dat clone <link> [download-folder]'
  ].join('\n'),
  options: [
    {
      name: 'empty',
      boolean: false,
      default: false,
      help: 'Do not download files by default. Files must be synced manually.'
    },
    {
      name: 'upload',
      boolean: true,
      default: true,
      help: 'announce your address on link (improves connection capability) and upload data to other downloaders.'
    },
    {
      name: 'show-key',
      boolean: true,
      default: false,
      abbr: 'k',
      help: 'print out the dat key'
    }
  ]
}

function clone (opts) {
  var fs = require('fs')
  var path = require('path')
  var rimraf = require('rimraf')
  var Dat = require('dat-node')
  var linkResolve = require('dat-link-resolve')
  var neatLog = require('neat-log')
  var archiveUI = require('../ui/archive')
  var trackArchive = require('../lib/archive')
  var discoveryExit = require('../lib/discovery-exit')
  var onExit = require('../lib/exit')
  var parseArgs = require('../parse-args')
  var debug = require('debug')('dat')
  var parsed = parseArgs(opts)

  opts.key = parsed.key || opts._[0] // pass other links to resolver
  opts.dir = parsed.dir

  // variables needed to check if opts.key is on system and leads to a dat.json file.
  var datPath = opts.key
  var onSystem = fs.existsSync(datPath)
  var isDir = false
  var isDatJson = false

  // if the file or directory is on system check to see whether the path is to a dat.json file or directory.
  if (onSystem) {
    isDir = fs.lstatSync(datPath).isDirectory()
    isDatJson = (fs.lstatSync(datPath).isFile() && (path.basename(datPath) === 'dat.json'))
  }

  // if file is a dat.json resolve absolute path. else if directory try to resolve path to dat.json.
  if (isDatJson) {
    datPath = path.resolve(datPath)
  } else if (isDir) {
    datPath = path.join(datPath, 'dat.json')
  }

  // if the datPath is valid parse it for a url key and set opts.key to the parsed url key.
  if (fs.existsSync(datPath)) opts.key = JSON.parse(fs.readFileSync(datPath, 'utf8')).url

  opts.showKey = opts['show-key'] // using abbr in option makes printed help confusing
  opts.sparse = opts.empty

  debug('clone()')
  debug(Object.assign({}, opts, {key: '<private>', _: null})) // don't show key

  var neat = neatLog(archiveUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(trackArchive)
  neat.use(discoveryExit)
  neat.use(onExit)
  neat.use(function (state, bus) {
    if (!opts.key) return bus.emit('exit:warn', 'key required to clone')

    state.opts = opts
    var createdDirectory = null // so we can delete directory if we get error

    // Force these options for clone command
    opts.exit = (opts.exit !== false)
    // opts.errorIfExists = true // TODO: do we want to force this?

    linkResolve(opts.key, function (err, key) {
      if (err && err.message.indexOf('Invalid key') === -1) return bus.emit('exit:error', 'Could not resolve link')
      else if (err) return bus.emit('exit:warn', 'Link is not a valid Dat link.')

      opts.key = key
      createDir(opts.key, function () {
        bus.emit('key', key)
        runDat()
      })
    })

    function createDir (key, cb) {
      debug('Checking directory for clone')
      // Create the directory if it doesn't exist
      // If no dir is specified, we put dat in a dir with name = key
      if (!opts.dir) opts.dir = key
      fs.access(opts.dir, fs.F_OK, function (err) {
        if (!err) {
          createdDirectory = false
          return cb()
        }
        debug('No existing directory, creating it.')
        createdDirectory = true
        fs.mkdir(opts.dir, cb)
      })
    }

    function runDat () {
      Dat(opts.dir, opts, function (err, dat) {
        if (err && err.name === 'ExistsError') return bus.emit('exit:warn', 'Existing archive in this directory. Use pull or sync to update.')
        if (err) {
          if (createdDirectory) rimraf.sync(dat.path)
          return bus.emit('exit:error', err)
        }
        if (dat.writable) return bus.emit('exit:warn', 'Archive is writable. Cannot clone your own archive =).')

        state.dat = dat
        state.title = 'Cloning'
        bus.emit('dat')
        bus.emit('render')
      })
    }
  })
}
