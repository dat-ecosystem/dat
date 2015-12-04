#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var dat = require('./')

var cmd = args._[0]

run()

function run () {
  var loc = args._[1] || process.cwd()
  if (cmd === 'share') {
    // share
    var db1 = dat(loc, {datPath: './.dat1'})
    db1.share()
  } else if (cmd) {
    // download
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    var db2 = dat(loc, {datPath: './.dat2'})
    db2.download(hash)
  } else {
    return usage('root.txt')
  }
}
