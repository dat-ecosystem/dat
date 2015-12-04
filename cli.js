#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var dat = require('./')

var cmd = args._[0]

run()

function run () {
  if (cmd === 'share') {
    // share
    var loc = args._[1] || process.cwd()
    var db = dat(loc)
    db.share()
  } else if (cmd) {
    // download
    var hash = args._[1]
    if (!hash) return usage()
  } else {
    return usage('root.txt')
  }
}
