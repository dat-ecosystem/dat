var fs = require('fs')
var tty = require('tty')
var debug = require('debug')('dat.parseCLI')

module.exports = {
  command: command,
  writeInputStream: writeInputStream,
  getInputStream: getInputStream
}

function writeInputStream(inputStream, dat, argv) {
  var writer = dat.createWriteStream(argv)
  
  inputStream.pipe(writer)
  
  if (!argv.quiet) dat.progressLog(writer, 'Parsed', 'Done')
  
  if (argv.results) writer.pipe(dat.resultPrinter())
  
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

function getInputStream(argv, cmd) {
  var first = argv._[0] || ''
  var second = argv._[1] || ''
  var isTTY = tty.isatty(0)

  debug('getInputStream', 'isTTY=' + isTTY, 'argv=' + JSON.stringify(argv))

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

  if (argv.csv
    || argv.f === 'csv'
    || argv.json
    || argv.f === 'json') {
      debug('using fs.createReadStream', second, 'as input')
      return fs.createReadStream(second)
    }

}

function command(argv) {
  var args = argv._
  var cmd = args[0]
  var options = {}
  var idx = 0
  args.map(function(arg) {
    options[idx] = arg
    idx++
  })
  var skip = ['$0', '_']
  Object.keys(argv).map(function(arg) {
    if (skip.indexOf(arg) > -1) return
    options[arg] = argv[arg]
  })

  // translate --version or -v -> `dat version`
  if (!cmd && (options['v'] || options['version']))
    cmd = 'version'

  return {command: cmd, options: options, tty:tty.isatty(0)}
}
