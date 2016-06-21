var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')

module.exports = function (args) {
  var dat = Dat(args)
  var pathName = dat.dir === '.' ? process.cwd() : dat.dir
  //var logger = statusLogger(args)

  dat.on('ready', function () {
    console.log('Starting dat at: ', pathName)
    dat.addFiles(function (err) {
      onerror(err)
    })
  })

  dat.on('key', function (key) {
    console.log('key', key)
  })

  dat.on('file-added', function (data) {
    console.log('file added: ', data.relname)
  })

  dat.on('file-exists', function (data) {
    console.log('file exists: ', data.name)
  })

  dat.on('swarm-update', function () {
    console.log('peers: ', dat.swarm.connections)
  })
}

function onerror (err) {
  console.error(err.stack || err)
  process.exit(1)
}
