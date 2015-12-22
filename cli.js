#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var fs = require('fs')
var dat = require('./')

var cmd = args._[0]

run()

function run () {
  var loc = args._[1] || process.cwd()
  var db
  if (cmd === 'share') {
    // share
    if (!fs.existsSync(loc)) return usage('root.txt')
    db = dat(loc)
    db.addDirectory(function (err, link) {
      if (err) throw err
      db.joinTcpSwarm(link, function (_err, link, port, close) {
        console.log(link)
      })
    })
  } else if (cmd) {
    // download
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    db = dat(loc)
    console.log('Downloading...')
    db.download(hash, function (err) {
      if (err) throw err
      console.log('Done downloading.')
    })
  } else {
    return usage('root.txt')
  }
}
