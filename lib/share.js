var assert = require('assert')
var basename = require('path').basename
var logger = require('status-logger')
var prettyBytes = require('pretty-bytes')
var xtend = require('xtend')
var Dat = require('dat-node')
var ui = require('./ui')
var debug = require('debug')('dat')

module.exports = function sync (type, opts, dat) {
  assert.ok(type, 'lib/share share type required')
  assert.ok(['sync'].indexOf(type) > -1, 'lib/share type must be sync')

  debug('Share: ' + type + ' on ' + dat.key.toString('hex'))

  var importDone = false
  var importStatus = null
  var network = null
  var stats = null
  var fileOutput, liveProgressOutput

  // Logging Init.
  // After download require because downloader has it's own logger
  var output = [
    [
      'Starting Dat...', // Shows Folder Name
      '', // Shows Link
      '', // Shows Importing Progress Bar
      '', // Shows Total Size Info
      '' //  spacer before network info
    ],
    [''] // Shows network information
  ]
  var progressOutput = output[0] // shortcut for progress output
  if (opts.watch) {
    output.push(['', '', ''], []) // progress bar, live file list
    liveProgressOutput = output[2]
    fileOutput = output[3]
  }
  var log = logger(output, {debug: opts.verbose, quiet: opts.quiet || opts.debug}) // If debug=true we want output to be quiet.

  // UI Elements
  var importUI = ui.importProgress()
  var exit = ui.exit(log)

  // Printing Things!!
  setInterval(function () {
    if (importStatus && !importDone) updateImport()
    if (network) updateNetwork()
    log.print()
  }, opts.logspeed)

  // Action starts here
  if (!dat) Dat(opts.dir, opts, start)
  else start(null, dat)

  function start (err, theDat) {
    if (err) return exit(err)

    dat = theDat

    // General Archive Info
    progressOutput[0] = `Syncing Dat Archive: ${dat.path}`
    progressOutput[1] = ui.link(dat.key) + '\n'
    if (opts.quiet) process.stdout.write(ui.link(dat.key))

    // Stats (used for network + download)
    stats = dat.trackStats()

    // Network
    var networkOpts = xtend(opts, {})
    if (dat.owner) networkOpts.download = false
    network = dat.joinNetwork(networkOpts)
    network.swarm.once('connection', function () {
      debug('Network: first peer connected')
    })

    if (dat.owner && opts.import) {
      debug('Importing updated & new files into archive')
      // File Imports
      progressOutput[2] = 'Importing files...'

      importStatus = dat.importFiles({
        watch: opts.watch, // TODO: allow live: true. opts.live is used by archive.live though =(
        resume: true,
        ignoreHidden: opts.ignoreHidden
      }, function (err) {
        if (err) return exit(err)
        debug('Import finished')
        var st = stats.get()
        importDone = true
        progressOutput[2] = opts.watch ? 'Watching for file changes...' : 'Archive update finished! Sharing latest files.'
        progressOutput[3] = `Total Size: ${st.filesTotal} ${st.filesTotal === 1 ? 'file' : 'files'} (${prettyBytes(st.bytesTotal)})`

        if (opts.watch) {
          var pending = 0
          importStatus.on('file watch event', function (file) {
            pending++
            debug(`File watch ${file.mode}: ${basename(file.path)}`)
            // liveProgressOutput.splice(2, 0, `Importing: ${ basename(file.path)}`)
            // liveProgressOutput.splice(-2, 1)
          })
          importStatus.on('file imported', function (file) {
            if (fileOutput.length > 6) {
              fileOutput.pop()
            }
            var fileAction = file.mode === 'created' ? 'Added' : 'Updated'
            fileOutput.unshift(`${fileAction}: ${basename(file.path)}`)
            pending--
            debug(`File ${file.mode}: ${basename(file.path)}`)
          })
          importStatus.on('file skipped', function (file) {
            pending--
            debug(`File skipped: ${basename(file.path)}`)
          })
          setInterval(function () {
            if (pending) liveProgressOutput[1] = `Importing ${pending} files...`
            else liveProgressOutput[1] = ''
            progressOutput[3] = `Total Size: ${st.filesTotal} ${st.filesTotal === 1 ? 'file' : 'files'} (${prettyBytes(st.bytesTotal)})`
          }, opts.logspeed)
        }
      })

      if (debug.enabled && importStatus) {
        importStatus.on('file imported', function (file) {
          debug(`Imported ${file.path}`)
        })
        setInterval(function () {
          if (!importDone) debug(`Imported ${prettyBytes(importStatus.bytesImported)} of ${prettyBytes(importStatus.countStats.bytes)}`)
        }, opts.logspeed)
      }
    }
  }

  function updateImport () {
    progressOutput[3] = importUI(importStatus)
  }

  function updateNetwork () {
    output[1] = ui.network(network.connected, stats.network)
  }
}
