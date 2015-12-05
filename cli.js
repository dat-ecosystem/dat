#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var dat = require('./')

var cmd = args._[0]

run()

function run () {
  var loc = args._[1] || process.cwd()
  var db
  if (cmd === 'share') {
    // share
    db = dat(loc, {datPath: './.dat'})
    db.share()
  } else if (cmd) {
    // download
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    db = dat(loc, {datPath: './.dat'})
    db.download(hash, function (err) {
      if (err) throw err
      console.log('done downloading')
    })
  } else {
    return usage('root.txt')
  }
}
