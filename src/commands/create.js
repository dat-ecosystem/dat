module.exports = {
  name: 'create',
  command: create,
  help: [
    'Create an empty dat and dat.json',
    '',
    'Usage: dat create [directory]'
  ].join('\n'),
  options: [
    {
      name: 'yes',
      boolean: true,
      default: false,
      abbr: 'y',
      help: 'Skip dat.json creation.'
    },
    {
      name: 'title',
      help: 'the title property for dat.json'
    },
    {
      name: 'description',
      help: 'the description property for dat.json'
    }
  ]
}

function create (opts) {
  var path = require('path')
  var fs = require('fs')
  var Dat = require('dat-node')
  var output = require('neat-log/output')
  var DatJson = require('dat-json')
  var prompt = require('prompt')
  var chalk = require('chalk')
  var parseArgs = require('../parse-args')
  var debug = require('debug')('dat')

  debug('dat create')
  if (!opts.dir) {
    opts.dir = parseArgs(opts).dir || process.cwd()
  }

  var welcome = `Welcome to ${chalk.green(`dat`)} program!`
  var intro = output(`
    You can turn any folder on your computer into a Dat.
    A Dat is a folder with some magic.

    Your dat is ready!
    We will walk you through creating a 'dat.json' file.
    (You can skip dat.json and get started now.)

    Learn more about dat.json: ${chalk.blue(`https://github.com/datprotocol/dat.json`)}

    ${chalk.dim('Ctrl+C to exit at any time')}

  `)
  var outro

  // Force certain options
  opts.errorIfExists = true

  console.log(welcome)
  Dat(opts.dir, opts, function (err, dat) {
    if (err && err.name === 'ExistsError') return exitErr('\nArchive already exists.\nYou can use `dat sync` to update.')
    if (err) return exitErr(err)

    outro = output(`

      Created empty Dat in ${dat.path}/.dat

      Now you can add files and share:
      * Run ${chalk.green(`dat share`)} to create metadata and sync.
      * Copy the unique dat link and securely share it.

      ${chalk.blue(`dat://${dat.key.toString('hex')}`)}
    `)

    if (opts.yes) return done()

    console.log(intro)
    var datjson = DatJson(dat.archive, { file: path.join(opts.dir, 'dat.json') })
    fs.readFile(path.join(opts.dir, 'dat.json'), 'utf-8', function (err, data) {
      if (err || !data) return doPrompt()
      data = JSON.parse(data)
      debug('read existing dat.json data', data)
      doPrompt(data)
    })

    function doPrompt (data) {
      if (!data) data = {}

      var schema = {
        properties: {
          title: {
            description: chalk.magenta('Title'),
            default: data.title || '',
            // pattern: /^[a-zA-Z\s\-]+$/,
            // message: 'Name must be only letters, spaces, or dashes',
            required: false
          },
          description: {
            description: chalk.magenta('Description'),
            default: data.description || ''
          }
        }
      }

      prompt.override = { title: opts.title, description: opts.description }
      prompt.message = '' // chalk.green('> ')
      // prompt.delimiter = ''
      prompt.start()
      prompt.get(schema, writeDatJson)

      function writeDatJson (err, results) {
        if (err) return exitErr(err) // prompt error
        if (!results.title && !results.description) return done()
        datjson.create(results, done)
      }
    }

    function done (err) {
      if (err) return exitErr(err)
      console.log(outro)
    }
  })

  function exitErr (err) {
    if (err && err.message === 'canceled') {
      console.log('')
      console.log(outro)
      process.exit(0)
    }
    console.error(err)
    process.exit(1)
  }
}
