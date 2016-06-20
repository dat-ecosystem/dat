var chalk = require('chalk')
var prettyBytes = require('pretty-bytes')
var Dat = require('../lib/dat')

module.exports = function (args) {
  var dat = Dat(args)
  var pathName = dat.dir === '.' ? process.cwd() : dat.dir
  //var logger = statusLogger(args)

  dat.on('ready', function () {
    console.error('not implemented')
  })
}