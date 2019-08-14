const fs = require('fs')
const os = require('os')
const path = require('path')
const mkdirp = require('mkdirp')
const rimraf = require('rimraf')
const encoding = require('dat-encoding')
const recursiveReadSync = require('recursive-readdir-sync')
const Dat = require('dat-node')
const ram = require('random-access-memory')
const hypercore = require('hypercore')
const swarm = require('hyperdiscovery')

module.exports.matchLink = matchDatLink
module.exports.isDir = isDir
module.exports.testFolder = newTestFolder
module.exports.datJson = datJson
module.exports.shareFixtures = shareFixtures
module.exports.shareFeed = shareFeed
module.exports.fileList = fileList

function shareFixtures (opts, cb) {
  if (typeof opts === 'function') return shareFixtures(null, opts)
  opts = opts || {}
  const fixtures = path.join(__dirname, '..', 'fixtures')
  // os x adds this if you view the fixtures in finder and breaks the file count assertions
  try { fs.unlinkSync(path.join(fixtures, '.DS_Store')) } catch (e) { /* ignore error */ }
  if (opts.resume !== true) rimraf.sync(path.join(fixtures, '.dat'))
  Dat(fixtures, {}, function (err, dat) {
    if (err) throw err
    dat.trackStats()
    dat.joinNetwork()
    if (opts.import === false) return cb(null, dat)
    dat.importFiles({ watch: false }, function (err) {
      if (err) throw err
      cb(null, dat)
    })
  })
}

function fileList (dir) {
  try {
    return recursiveReadSync(dir)
  } catch (e) {
    return []
  }
}

function newTestFolder () {
  const tmpdir = path.join(os.tmpdir(), 'dat-download-folder')
  rimraf.sync(tmpdir)
  mkdirp.sync(tmpdir)
  return tmpdir
}

function matchDatLink (str) {
  const match = str.match(/[A-Za-z0-9]{64}/)
  if (!match) return false
  let key
  try {
    key = encoding.toStr(match[0].trim())
  } catch (e) {
    return false
  }
  return key
}

function datJson (filepath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(filepath, 'dat.json')))
  } catch (e) {
    return {}
  }
}

function isDir (dir) {
  try {
    return fs.statSync(dir).isDirectory()
  } catch (e) {
    return false
  }
}

function shareFeed (cb) {
  let sw
  const feed = hypercore(ram)
  feed.append('hello world', function (err) {
    if (err) throw err
    cb(null, encoding.toStr(feed.key), close)
  })
  feed.ready(function () {
    sw = swarm(feed)
  })

  function close (cb) {
    feed.close(function () {
      sw.close(cb)
    })
  }
}
