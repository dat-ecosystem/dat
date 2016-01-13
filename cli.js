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
    var statsScan = db.fileStats(dirs, function (err, stats) {
      printScanProgress(stats)
      clearInterval(scanInterval)
      if (err) throw err
      console.error() // newline
      var statsAdd = db.addFiles(dirs, function (err, link) {
        printAddProgress(statsAdd, statsScan.files)
        clearInterval(addInterval)
        if (err) throw err
        db.joinTcpSwarm(link, function (_err, link, port, close) {
          singleLineLog.stderr('') // clear previous stderr
          singleLineLog.stdout('dat://' + link)
          console.error() // final newline
        })
      })

      var addInterval = setInterval(function () {
        printAddProgress(statsAdd, statsScan.files)
      }, 100)
    })

    var scanInterval = setInterval(function () {
      printScanProgress(statsScan)
    }, 100)
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

function printScanProgress (stats) {
  singleLineLog.stderr(
    'Scanning folder, found ' + stats.files + ' files, ' +
    stats.directories + ' directories.' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total.' : '')
  )
}

function printAddProgress (stats, total) {
  singleLineLog.stderr(
    'Fingerprinting files... (' + stats.files + '/' + total + ')'
  )
}
