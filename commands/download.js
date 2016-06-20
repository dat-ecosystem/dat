var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')

module.exports = function (args) {
  var dat = Dat(args)
  var pathName = dat.dir === '.' ? process.cwd() : dat.dir
  //var logger = statusLogger(args)

  dat.on('ready', function () {
    console.log('Starting dat at: ', pathName)
    dat.download()
  })

  dat.on('file-downloaded', function (data) {
    console.log('file downloaded: ', data.name)
  })

  dat.on('download-finished', function () {
    console.log('download finished')
  })
}