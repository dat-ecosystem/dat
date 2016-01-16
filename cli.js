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
        db.joinTcpSwarm(link, function (_err, swarm) {
          singleLineLog.stderr('') // clear previous stderr
          singleLineLog.stdout('dat://' + swarm.link)
          console.error() // final newline
          seedSwarm(swarm)
        })
      })

      var addInterval = setInterval(function () {
        printAddProgress(statsAdd, statsScan.files)
      }, 100)
    })

    var scanInterval = setInterval(function () {
      printScanProgress(statsScan)
    }, 100)
  } else if (firstArg === 'list') {
    db = dat({home: args.home})
    db.drive._links.createValueStream().on('data', function (o) {
      console.log(o)
    })
  } else if (firstArg) {
    // download/share
    var hash = args._[0]
    if (!hash) return usage('root.txt')
    var downloadStats = db.download(hash, loc, function (err, swarm) {
      if (err) throw err
      printDownloadStats(downloadStats)
      clearInterval(downloadInterval)
      console.log('Done downloading.\n')
      seedSwarm(swarm)
    })
    printDownloadStats(downloadStats)
    var downloadInterval = setInterval(function () {
      printDownloadStats(downloadStats)
    }, 100)
  } else {
    return usage('root.txt')
  }
}

function seedSwarm (swarm) {
  var swarmInterval = setInterval(function () {
    printSwarmStats(swarm)
  }, 500)
  printSwarmStats(swarm)

  // intercept ctrl+c and do graceful exit
  process.on('SIGINT', function () {
    clearInterval(swarmInterval)
    swarm.close(function (err) {
      if (err) throw err
      else process.exit(0)
    })
  })
}

function printScanProgress (stats) {
  singleLineLog.stderr(
    'Scanning folder, found ' + stats.files + ' files in ' +
    stats.directories + ' directories.' +
    (stats.size ? ' ' + prettyBytes(stats.size) + ' total.' : '')
  )
}

function printAddProgress (stats, total) {
  singleLineLog.stderr('Fingerprinting files... (' + stats.files + '/' + total + ')')
}

function printSwarmStats (swarm) {
  singleLineLog.stderr('Serving data (' + swarm.connections.sockets.length + ' connection(s))\n')
}

function printDownloadStats (stats) {
  singleLineLog.stderr('Downloading' + (stats ? ' file ' + stats.files : '') + '\n')
}
