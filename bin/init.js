var path = require('path')
var dat = require('dat-core')
var debug = require('debug')('bin/init')
var abort = require('../lib/abort.js')
var usage = require('../lib/usage.js')('init.txt')

module.exports = {
  name: 'init',
  command: handleInit
}

function handleInit (args) {
  debug('handleInit', args)
  if (args.help) return usage()
  tryOpen()

  function tryOpen () {
    var db = dat(args.path)
    db.on('error', create)
    db.on('ready', ready)

    function ready () {
      console.error('Skipping init, there is already a dat at', path.join(args.path, '.dat'))
      process.exit(0)
    }
  }

  function create () {
    var db = dat(args.path, {createIfMissing: true})

    db.on('error', function error (err) {
      abort(err)
    })

    db.on('ready', function ready () {
      console.error('Initialized a new dat at', path.join(args.path, '.dat'))
      process.exit(0)
    })
  }
}
