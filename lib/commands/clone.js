var fs = require('fs')
var nets = require('nets')
var stringKey = require('dat-encoding').toStr
var exit = require('../ui').exitErr
var download = require('../download')
var debug = require('debug')('dat')

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
      name: 'temp',
      boolean: true,
      default: false,
      help: 'use an in-memory database for metadata'
    },
    {
      name: 'upload',
      boolean: true,
      default: false,
      help: 'upload data to other peers while cloning'
    }
  ]
}

function clone (opts) {
  opts.key = opts._[0]
  if (!opts.key) return exit('key required to clone')

  // Force these options for clone command
  opts.exit = true
  opts.newDir = null

  try {
    // validates + removes dat://
    opts.key = stringKey(opts.key)
    createDir(opts.key, run)
  } catch (e) {
    lookup()
  }

  function lookup () {
    var url = opts.key.indexOf('http') > -1 ? opts.key : 'http://' + opts.key

    debug('Registry lookup at:', url)
    nets({ url: url, json: true }, function (err, resp, body) {
      if (err) return exit(err)
      if (resp.statusCode !== 200) return exit(body.message)

      // first check if it's a hyperdrive-http response
      opts.key = resp.headers['hyperdrive-key']
      if (opts.key) {
        debug('Received key from http header:', opts.key)
        createDir(opts.key, run)
        return
      }

      // else fall back to parsing the body
      try {
        opts.key = stringKey(body.url)
        debug('Received key from registry:', opts.key)
        if (opts.key) return createDir(url.split('/').pop(), run) // dirname is name of repo
      } catch (e) {
        console.error(new Error(e))
      }
      exit('Error getting key from registry')
    })
  }

  function run () {
    download('clone', opts)
  }

  function createDir (dir, cb) {
    debug('Creating directory for clone', dir)
    // Create the directory if it doesn't exist
    // If no dir is specified, we put dat in a dir with name = key
    opts.dir = opts._[1] || opts.dir
    if (!opts.dir || opts.dir === process.cwd()) { // Don't allow download to cwd for now
      opts.dir = dir // key or dataset name if using registry shortname
    }
    try {
      fs.accessSync(opts.dir, fs.F_OK)
      opts.newDir = false
    } catch (e) {
      opts.newDir = true
      fs.mkdirSync(opts.dir)
    }
    cb()
  }
}
