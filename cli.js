#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var fs = require('fs')
var dat = require('./')

var cmd = args._[0]

run()

function run () {
  var loc = args._[1] || process.cwd()
  if (!fs.existsSync(loc)) return usage('root.txt')
  var db = dat(loc, {home: args.home})
  if (cmd === 'share') {
    // share
    db.addDirectory(function (err, link) {
      if (err) throw err
      db.joinTcpSwarm(link, function (_err, link, port, close) {
        console.log(link)
      })
    })
  } else if (cmd === 'snapshot') {
    db.addDirectory(function (err, link) {
      if (err) throw err
      console.log(link)
      db.close()
    })
  } else if (cmd) {
    // download
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    console.log('Downloading...')
    db.download(hash, function (err) {
      if (err) throw err
      console.log('Done downloading.')
    })
  } else {
    return usage('root.txt')
  }
}
