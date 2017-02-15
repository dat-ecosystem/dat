var assert = require('assert')
var logger = require('status-logger')
var prettyBytes = require('pretty-bytes')
var rimraf = require('rimraf')
var memdb = require('memdb')
var Dat = require('dat-node')
var ui = require('./ui')
var debug = require('debug')('dat')

module.exports = function (type, opts, dat) {
  assert.ok(type, 'lib/download download type required')
  assert.ok(['sync', 'clone', 'pull'].indexOf(type) > -1, 'lib/download download type must be sync, clone, pull')

  // TODO: clean up this logic
  var resume = opts.resume || false
  var hasKey = dat && dat.key || opts.key
  if (!hasKey && !resume) return ui.exit()('lib/download Key required to download')

  var network = null
  var stats = null
  var archive = null
  var onceConnected = false

  // Logging Init
  var output = [
    [
      'Starting Dat...', // Shows Folder Name
      '', // Shows Link
      '', // Shows Metadata Progress Bar
      '', // Shows Content Progress Bar
      '', // Shows Total Size Info
      '' //  spacer before network info
    ],
    [] // Shows network information
  ]
  var progressOutput = output[0] // shortcut for progress output
  var log = logger(output, {debug: opts.verbose, quiet: opts.quiet || opts.debug}) // If debug=true we want output to be quiet

  // UI Elements
  var bar = ui.bar()
  var exit = ui.exit(log)

  // Printing Things!!
  if (opts.debug) opts.logspeed = 1000
  setInterval(function () {
    if (stats) updateDownload()
    if (network) updateNetwork()
    log.print()
  }, opts.logspeed)

  // Action starts here
  if (opts.temp) opts.db = memdb()
  if (!dat) Dat(opts.dir, opts, start)
  else start(null, dat)

  function start (err, theDat) {
    if (err) return exit(err)

    dat = theDat

    debug('Download: ' + type + ' on ' + dat.key.toString('hex'))

    archive = dat.archive

    archive.open(function () {
      if (!archive.content) return removeExit() // Not an archive
      archive.content.once('download-finished', checkDone)
    })
    // TODO: could be optimized for frequent metadata updates
    archive.metadata.on('update', updateDownload)

    // General Archive Info
    var niceType = (type === 'clone') ? 'Cloning' : type.charAt(0).toUpperCase() + type.slice(1) + 'ing'
    progressOutput[0] = `${niceType} Dat Archive: ${dat.path}`
    progressOutput[1] = ui.link(dat.key) + '\n'
    if (opts.quiet && type !== 'clone') process.stdout.write(ui.link(dat.key))

    // Stats
    stats = dat.trackStats()
    stats.on('update:blocksProgress', checkDone)

    // Network
    if (!opts.upload && type !== 'sync') opts.upload = false // Do not upload on pull/clone
    network = dat.joinNetwork(opts)
    network.swarm.once('connection', function (peer) {
      debug('Network: first peer connected')
      onceConnected = true
      progressOutput[2] = 'Starting Download...'
    })
    progressOutput[2] = 'Looking for Dat Archive in Network'

    function removeExit () {
      output[0] = ['']
      output[1] = ['']
      log.print()
      if (opts.newDir) rimraf.sync(dat.path)
      return exit('Link is not a Dat Archive. Please check you have the correct link.')
    }
  }

  function updateDownload () {
    if (!archive.content) {
      progressOutput[2] = '... Fetching Metadata'
      return
    }
    // TODO: think about how this could work for empty archives & slow metadata downloads
    if (checkDone()) return
    var st = stats.get()

    var metaBlocksProgress = archive.metadata.blocks - archive.metadata.blocksRemaining()
    var metaProgress = Math.round(metaBlocksProgress * 100 / archive.metadata.blocks)
    var contentBlocksProgress = archive.content.blocks - archive.content.blocksRemaining()
    var contentProgress = archive.content.blocks === 0 ? 0 : (contentBlocksProgress * 100 / archive.content.blocks).toFixed(2)
    // TODO: fix hyperdrive-stats bug where blocksProgress > blocksTotal
    // var contentProgress = st.blocksTotal === 0 ? 0 : Math.round(st.blocksProgress * 100 / st.blocksTotal)
    progressOutput[2] = 'Metadata: ' + bar(metaProgress) + ' ' + metaProgress + '%'
    progressOutput[3] = 'Content:  ' + bar(contentProgress) + ' ' + contentProgress + '%'

    if (!onceConnected && dat.live) progressOutput[4] = 'Waiting for connections to check for updates.'
    else progressOutput[4] = `Total size: ${st.filesTotal} ${st.filesTotal === 1 ? 'file' : 'files'} (${prettyBytes(st.bytesTotal)})`

    if (metaProgress < 100) debug('Metadata Download Progress:', metaProgress + '%')
    if (contentProgress < 100) debug('Download Progress:', contentProgress + '%')
  }

  function updateNetwork () {
    output[1] = ui.network(network.connected, stats.network)
  }

  function checkDone () {
    if (!onceConnected || archive.metadata.blocksRemaining() !== 0) return false
    if (!archive.content || archive.content.blocksRemaining() !== 0) return false
    if (archive.metadata.blocks > 1 && !archive.content.blocks) return false // If metadata.blocks = 1, content feed is empty so finish

    var st = stats.get()

    progressOutput[2] = ''
    progressOutput[3] = (type === 'sync') ? 'Files updated to latest!' : 'Download Finished!'
    progressOutput[4] = `Total size: ${st.filesTotal} ${st.filesTotal === 1 ? 'file' : 'files'} (${prettyBytes(st.bytesTotal)})`

    debug('Download finished')
    if (!opts.exit) return true

    // Exit!
    output[1] = '' // remove network info
    return exit()
  }
}
