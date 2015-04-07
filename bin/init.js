var path = require('path')
var dat = require('dat-core')
var debug = require('debug')('bin/init')

module.exports = {
  name: 'init',
  command: handleInit,
  options: [
    {
      name: 'path',
      boolean: false,
      default: process.cwd(),
      abbr: 'p'
    }
  ]
}

function handleInit (args) {
  debug('handleInit', args)
  tryOpen()
  
  function tryOpen () {
    var db = dat(args.path)
    db.on('error', create)
    db.on('ready', ready)

    function ready () {
      console.error('Skipping init, there is already a dat at', path.join(args.path, '.dat'))
    }
  }
  
  function create () {
    var db = dat(args.path, {createIfMissing: true})

    db.on('error', function error (err) {
      throw err
    })

    db.on('ready', function ready () {
      console.error('Initialized a new dat at', path.join(args.path, '.dat'))
    })
  }
}
