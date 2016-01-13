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
      if (err) throw err
      printScanProgress(stats)
      clearInterval(scanInterval)
      console.error() // newline
      var statsAdd = db.addFiles(dirs, function (err, link) {
        printAddProgress(statsAdd, statsScan.files)
        clearInterval(addInterval)
        if (err) throw err
        db.joinTcpSwarm(link, function (_err, link, port, close) {
          singleLineLog.stderr('') // clear previous stderr
          singleLineLog.stdout('dat://' + link)
          console.error() // final newline

          // intercept ctrl+c and do graceful exit
          process.on('SIGINT', function () {
            close(function (err) {
              if (err) throw err
              else process.exit(0)
            })
          })
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
    'Scanning folder, found ' + stats.files + ' files in ' +
    stats.directories + ' directories.' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total.' : '')
  )
}

function printAddProgress (stats, total) {
  singleLineLog.stderr(
    'Fingerprinting files... (' + stats.files + '/' + total + ')'
  )
}
