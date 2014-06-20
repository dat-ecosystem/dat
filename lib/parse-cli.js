var fs = require('fs')
var concat = require('concat-stream')
var tty = require('tty')
var debug = require('debug')('dat.parseCLI')

module.exports = {
  command: command,
  writeInputStream: writeInputStream,
  getInputStream: getInputStream
}

function writeInputStream(inputStream, dat, cmd) {
  var writer = dat.createWriteStream(cmd.option)
  
  inputStream.pipe(writer)
  
  if (!cmd.options.quiet) dat.progressLog(writer, 'Parsed', 'Done')
  
  if (cmd.options.results) writer.pipe(concat({encoding: 'object'}, function(results) {
    results.map(function(r) {
      console.log(r)
    })
  }))
  
  writer.on('end', function() {
    // HACK: give dat 1000 seconds to do any post-write actions (e.g. setMeta which waits for mutex flush)
    setTimeout(function() {
      dat.close()
    }, 1000)
  })
  
  writer.on('error', function(e) {
    // TODO prettier error printing
    writer.end()
    setTimeout(function() {
      console.error('write stream error', e, e.stack)
    }, 25)
    dat.close()
  })
}

function getInputStream(cmd) {
  var first = cmd.command || ''
  var second = cmd.options['1'] || ''
  var isTTY = tty.isatty(0)

  debug('getInputStream', 'isTTY=' + isTTY, 'cmd=' + JSON.stringify(cmd))

  // cat foo.txt | dat input -
  if (!isTTY && second === '-') {
    debug('using process.stdin as input')
    return process.stdin
  }

  // cat foo.txt | dat input - w/o relying on isTTY
  if (first === 'import' && second === '') {
    debug('using process.stdin as input due to import w/ no arguments')
    return process.stdin
  }

  if (!second) return

  if (cmd.options.csv
    || cmd.options.f === 'csv'
    || cmd.options.json
    || cmd.options.f === 'json') {
      debug('using fs.createReadStream', second, 'as input')
      return fs.createReadStream(second)
    }

}

function command() {
// add options:
// quiet
// f
//

  var opts = require('nomnom')
    .option('json', {
      flag: true,
      help: 'Import data as a json object'
    })
    .option('csv', {
      flag: true,
      help: 'Import data as csv object'
    })
    .option('version', {
      flag: true,
      abbr: 'v',
      help: 'Print version and exit'
    })
    .option('quiet', {
      flag: true,
      help: 'Display less Output'
    })
    .option('results', {
      flag: true,
      help: 'Output results'
    })
    .option('dir', {
      flag: true,
      help: 'Use a custom path'
    })
    .parse()

  var cmd = opts['0'];
  delete opts['0'];
  delete opts['_'];
  
  if(!cmd && opts.version) {
    cmd = 'version';
  }

  return {
    command: cmd,
    options: opts
  }

}
