#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2))
var usage = require('./usage')
var fs = require('fs')
var singleLineLog = require('single-line-log')
var prettyBytes = require('pretty-bytes')
var dat = require('./index.js')

var firstArg = args._[0]

run()

function run () {
  var loc = args.path || process.cwd()
  if (!fs.existsSync(loc)) {
    console.error('Does not exist:', loc)
    return usage('root.txt')
  }
  var db = dat({home: args.home})
  if (firstArg === 'link') {
    var dirs = args._.slice(1)
    if (dirs.length === 0) dirs = loc
    var statsProgress = db.fileStats(dirs, function (err, stats) {
      printProgress(stats)
      clearInterval(progressInterval)
      if (err) throw err
      console.error() // newline
      singleLineLog.stderr('Adding data and creating share link...')
      db.addFiles(dirs, function (err, link) {
        if (err) throw err
        db.joinTcpSwarm(link, function (_err, link, port, close) {
          singleLineLog.stderr('') // clear previous stderr
          singleLineLog.stdout('dat://' + link)
        })
      })
    })

    var progressInterval = setInterval(function () {
      printProgress(statsProgress)
    }, 10)
  } else if (firstArg) {
    // download/share
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    console.log('Downloading...')
    db.download(hash, loc, function (err) {
      if (err) throw err
      console.log('Done downloading.')
    })
  } else {
    return usage('root.txt')
  }
}

function printProgress (stats) {
  singleLineLog.stderr(
    'Scanning folder, found ' + stats.files + ' files, ' +
    stats.directories + ' directories.' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total.' : '')
  )
}
