var path = require('path')
var fs = require('fs')
var Dat = require('dat-node')
var neatLog = require('neat-log')
var DatJson = require('dat-json')
var prompt = require('prompt')
var chalk = require('chalk')
var createUI = require('../ui/create')
var trackArchive = require('../lib/archive')
var onExit = require('../lib/exit')
var debug = require('debug')('dat')

module.exports = {
  name: 'create',
  command: create,
  help: [
    'Create a local Dat archive to share',
    '',
    'Usage: dat create [directory]'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: false,
      help: 'Import files from the directory'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: true,
      abbr: 'ignore-hidden'
    }
  ]
}

function create (opts) {
  debug('dat create')
  if (opts._.length) opts.dir = opts._[0] // use first arg as dir if default set
  else if (!opts.dir) opts.dir = process.cwd()

  // Force certain options
  opts.errorIfExists = true

  // Todo
  // debug('Creating Dat archive in', opts.dir)

  var neat = neatLog(createUI, { logspeed: opts.logspeed, quiet: opts.quiet })
  neat.use(trackArchive)
  neat.use(onExit)
  neat.use(function (state, bus) {
    state.opts = opts
    state.joinNetwork = false

    Dat(opts.dir, opts, function (err, dat) {
      if (err && err.name === 'ExistsError') return bus.emit('exit:warn', 'Archive already exists.')
      if (err) return bus.emit('exit:error', err)


      // create before import
      datjson = DatJson(dat.archive, { file: path.join(opts.dir, 'dat.json') })
      fs.readFile(path.join(opts.dir, 'dat.json'), 'utf-8', function (err, data) {
        if (err) return doPrompt()
        data = JSON.parse(data)
        debug('read existing dat.json data', data)
        doPrompt(data)
      })

      function doPrompt(data) {
        if (!data) data = {}

        var schema = {
          properties: {
            title: {
              description: chalk.magenta('Dat Title'),
              default: data.title || '',
              pattern: /^[a-zA-Z\s\-]+$/,
              message: 'Name must be only letters, spaces, or dashes',
              required: false
            },
            description: {
              description: chalk.magenta('Dat Description'),
              default: data.description || ''
            },
            doImport: {
              description: chalk.magenta('Would you like to import your files?'),
              default: 'yes'
            }
          }
        }
        prompt.message = chalk.green('> ')
        prompt.delimiter = '' //chalk.cyan('')
        prompt.start()
        prompt.get(schema, writeDatJson)

        function writeDatJson (err, results) {
          if (err) return console.log(err.message) // prompt error
          if (results.doImport[0] === 'y') state.opts.import = true
          if (!results.title && !results.description) return done()
          delete results.doImport // don't want this in dat.json
          datjson.create(results, done)
        }

        function done (err) {
          if (err) return bus.emit('exit:error', err)
          state.title = 'Creating a new dat'
          state.dat = dat
          bus.emit('dat')
          bus.emit('render')
        }
      }
      bus.emit('render')
    })
  })
}
