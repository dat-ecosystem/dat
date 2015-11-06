var debug = require('debug')('bin/commit')
var dat = require('..')
var fs = require('fs')
var abort = require('../lib/util/abort.js')
var fsWalk = require('fswalk')
var usage = require('../lib/util/usage.js')('commit.txt')

module.exports = {
  name: 'commit',
  command: handleCommit,
  options: []
}

var IGNORE = 'data.dat'

function handleCommit (args) {
  debug('handleCommit', args)

  if (args.help) {
    return usage()
  }

  var db = dat(args)

  var files = []

  var onfile = function (filepath, stats) {
    if (filepath.indexOf(IGNORE) > 0) return
    stats.filename = filepath
    files.push(stats)
  }

  var onfinish = function (err) {
    if (err) abort(err, args)
    db.append(JSON.stringify(files))
    console.log('Done.')
  }

  fsWalk(args.path, onfile, onfinish)
}
