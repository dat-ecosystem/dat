var logger = require('status-logger')
var prettyBytes = require('pretty-bytes')
var Dat = require('dat-node')
var ui = require('../ui')
var datJson = require('../dat-json')
var debug = require('debug')('dat')

module.exports = {
  name: 'create',
  command: create,
  help: [
    'Create a local Dat archive to share',
    '',
    'Usage: dat create [directory]'
  ].join('\n'),
  options: [
    {
      name: 'import',
      boolean: true,
      default: false,
      help: 'Import files in the given directory'
    },
    {
      name: 'ignoreHidden',
      boolean: true,
      default: true,
      abbr: 'ignore-hidden'
    }
  ]
}

function create (opts) {
  opts.errorIfExists = true // cannot resume for create
  if (opts._.length && opts.dir === process.cwd()) opts.dir = opts._[0] // use first arg as dir if default set

  var importStatus = null

  // Logging Init
  var output = [
    'Creating Dat Archive...', // Shows Folder
    '' // Shows Link
  ]
  if (opts.import) {
    output = output.concat([
      '', // Spacer
      '', // Importing Progress
      ''  // Total Size
    ])
  }
  var log = logger(output, {debug: opts.verbose, quiet: opts.quiet || opts.debug})

  // UI Elements
  var importUI = ui.importProgress()
  var exit = ui.exit(log)

    // Printing Things!!
  setInterval(function () {
    if (importStatus) updateProgress()
    log.print()
  }, opts.logspeed)

  debug('Creating Dat archive in', opts.dir)
  Dat(opts.dir, opts, function (err, dat) {
    if (err && err.message.indexOf('Existing feeds') > -1 || (dat && dat.resumed)) return exit('Archive already exists. Use `dat sync` to resume sharing.')
    else if (err) return exit(err)

    // General Archive Info
    output[0] = `Dat ${opts.live !== false ? 'Archive' : 'Snapshot Archive'} created: ${dat.path}`
    if (dat.key) output[1] = ui.link(dat.key)
    else output[1] = 'Creating link...'
    if (opts.quiet && dat.key) process.stdout.write(ui.link(dat.key))

    if (dat.owner) {
      datJson.read(dat, function (err, body) {
        if (!err) return importFiles() // TODO: if dat.json exists, then what?
        if (err.code === 'ENOENT' || !body) {
          return datJson.write(dat, function (err) {
            if (err) return exit(err)
            importFiles()
          })
        }
        return exit(err)
      })
    }

    function importFiles () {
      // Not importing files. Just create .dat, print info, and exit.
      if (!opts.import) return exit()
      debug('Importing files into archive')

      output[3] = 'Importing files to archive...'
      importStatus = dat.importFiles({
        // Can't pass through opts here. opts.live has two meanings (archive.live, live file watching)
        live: false, // Never live (file watching) for `dat create`
        resume: false, // Never resume for `dat create`
        ignoreHidden: opts.ignoreHidden
      }, function (err) {
        if (err) return exit(err)
        output[3] = opts.live !== false ? 'File import finished!' : 'Snapshot created!'
        output[4] = `Total Size: ${importStatus.fileCount} ${importStatus.fileCount === 1 ? 'file' : 'files'} (${prettyBytes(importStatus.totalSize)})`

        debug('Dat archive created')
        if (dat.key) debug(ui.link(dat.key))

        if (opts.live !== false) return exit()
        dat.archive.finalize(function (err) {
          if (err) return exit(err)
          output[1] = ui.link(dat.key)
          exit()
        })
      })
      importStatus.on('file imported', function (file) {
        debug(file)
      })
    }
  })

  function updateProgress () {
    output[3] = importUI(importStatus)
  }
}
