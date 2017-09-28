module.exports = {
  name: 'keys',
  command: keys,
  help: [
    'View & manage dat keys',
    '',
    'Usage:',
    '',
    '  dat keys              view dat key and discovery key',
    '  dat keys export       export dat secret key',
    '  dat keys import       import dat secret key to make a dat writable',
    ''
  ].join('\n'),
  options: [
    {
      name: 'discovery',
      boolean: true,
      default: false,
      help: 'Print Discovery Key'
    }
  ]
}

function keys (opts) {
  var Dat = require('dat-node')
  var parseArgs = require('../parse-args')
  var debug = require('debug')('dat')

  debug('dat keys')
  if (!opts.dir) {
    opts.dir = parseArgs(opts).dir || process.cwd()
  }
  opts.createIfMissing = false // keys must always be a resumed archive

  Dat(opts.dir, opts, function (err, dat) {
    if (err && err.name === 'MissingError') return exit('Sorry, could not find a dat in this directory.')
    if (err) return exit(err)
    run(dat, opts)
  })
}

function run (dat, opts) {
  var subcommand = require('subcommand')
  var prompt = require('prompt')

  var config = {
    root: {
      command: function () {
        console.log(`dat://${dat.key.toString('hex')}`)
        if (opts.discovery) console.log(`Discovery key: ${dat.archive.discoveryKey.toString('hex')}`)
        process.exit()
      }
    },
    commands: [
      {
        name: 'export',
        command: function foo (args) {
          if (!dat.writable) return exit('Dat must be writable to export.')
          console.log(dat.archive.metadata.secretKey.toString('hex'))
        }
      },
      {
        name: 'import',
        command: function bar (args) {
          if (dat.writable) return exit('Dat is already writable.')
          importKey()
        }
      }
    ]
  }

  subcommand(config)(process.argv.slice(3))

  function importKey () {
    // get secret key & write

    var schema = {
      properties: {
        key: {
          pattern: /^[a-z0-9]{128}$/,
          message: 'Use `dat keys export` to get the secret key (128 character hash).',
          hidden: true,
          required: true,
          description: 'dat secret key'
        }
      }
    }
    prompt.message = ''
    prompt.start()
    prompt.get(schema, function (err, data) {
      if (err) return done(err)
      var secretKey = data.key
      if (typeof secretKey === 'string') secretKey = Buffer.from(secretKey, 'hex')
      // Automatically writes the metadata.ogd file
      dat.archive.metadata._storage.secretKey.write(0, secretKey, done)
    })

    function done (err) {
      if (err) return exit(err)
      console.log('Successful import. Dat is now writable.')
      exit()
    }
  }
}

function exit (err) {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  process.exit(0)
}
