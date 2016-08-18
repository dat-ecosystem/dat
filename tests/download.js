var fs = require('fs')
var os = require('os')
var path = require('path')
var test = require('tape')
var mkdirp = require('mkdirp')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')
var downloadDir = newTestFolder()

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

test('starts looking for peers with correct hash', function (t) {
  // cmd: dat <link> downloadDir
  var st = spawn(t, dat + ' 5hz25io80t0m1ttr332awpslmlfn1mc5bf1z8lvhh34a9r1ob3 ' + downloadDir)
  st.stdout.match(function (output) {
    var downloading = output.indexOf('Waiting for connections') > -1
    if (!downloading) return false
    t.ok(downloading, 'Started looking for Peers')
    st.kill()
    return true
  })
  st.end()
})

test('accepts dat-desktop links', function (t) {
  // cmd: dat dat://<link> downloadDir
  var st = spawn(t, dat + ' dat://ki0dg8b5ukc7oy5gcdhx4nr27ayncu4gdart3y1zf1b8p9sk48 ' + downloadDir)
  st.stdout.match(function (output) {
    var downloading = output.indexOf('Waiting for connections') > -1
    if (!downloading) return false
    t.ok(downloading, 'Started looking for Peers')
    st.kill()
    return true
  })
  st.end()
})

test('errors with invalid hash', function (t) {
  // cmd: dat pizza downloadDir
  rimraf.sync(path.join(downloadDir, '.dat'))
  var st = spawn(t, dat + ' pizza ' + downloadDir)
  st.stderr.match(function (output) {
    var gotError = output.indexOf('Invalid Dat Link') > -1
    t.ok(gotError, 'got error')
    if (gotError) return true
  })
  st.end()
})

test('makes directory if does not exist', function (t) {
  // cmd: dat pizza downloadDir
  rimraf.sync(path.join(downloadDir))
  var st = spawn(t, dat + ' 5hz25io80t0m1ttr332awpslmlfn1mc5bf1z8lvhh34a9r1ob3 ' + downloadDir)
  st.stdout.match(function (output) {
    var downloading = output.indexOf('Waiting for connections') > -1
    if (!downloading) return false
    t.ok(downloading, 'Started looking for Peers')
    st.kill()
    return true
  })
  st.end()
})

test('errors on new download without directory', function (t) {
  // cmd: dat <link>
  rimraf.sync(path.join(process.cwd(), '.dat')) // in case we have a .dat folder here
  var st = spawn(t, dat + ' 5hz25io80t0m1ttr332awpslmlfn1mc5bf1z8lvhh34a9r1ob3')
  st.stderr.match(function (output) {
    var gotError = output.indexOf('Directory required') > -1
    t.ok(gotError, 'got error')
    if (gotError) return true
  })
  st.end()
})

test('download resumes with same key', function (t) {
  // cmd: dat <link> . (twice)
  var tmpdir = newTestFolder()
  var link = null
  var share = spawn(t, dat + ' ' + fixtures, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    link = matches
    startDownloader()
    return true
  }, 'share started')

  function startDownloader () {
    // cmd: dat <link> tmpdir
    var downloader = spawn(t, dat + ' ' + link + ' ' + tmpdir, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !share) return false
      downloader.kill()
      spawnDownloaderTwo()
      return true
    }, 'download one started')
    downloader.end()
  }

  function spawnDownloaderTwo () {
    // cmd: dat <link> .
    var downloaderTwo = spawn(t, dat + ' ' + link + ' ' + tmpdir, {end: false})
    downloaderTwo.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !share) return false
      downloaderTwo.kill()
      return true
    }, 'download two resumed with same key')
    downloaderTwo.end(function () {
      t.end()
    })
  }
})

test('download twice to same dir errors', function (t) {
  // cmd: dat <link> . (twice)
  var tmpdir = newTestFolder()
  var link = null
  var share = spawn(t, dat + ' ' + fixtures, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    link = matches
    startDownloader()
    return true
  }, 'share started')

  function startDownloader () {
    // cmd: dat <link> tmpdir
    var downloader = spawn(t, dat + ' ' + link + ' ' + tmpdir, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !share) return false
      downloader.kill()
      spawnDownloaderTwo()
      return true
    }, 'download one started')
    downloader.end()
  }

  function spawnDownloaderTwo () {
    // cmd: dat <link> .
    var downloaderTwo = spawn(t, dat + ' 5hz25io80t0m1ttr332awpslmlfn1mc5bf1z8lvhh34a9r1ob3 ' + tmpdir, {end: false})
    downloaderTwo.stderr.match(function (output) {
      var contains = output.indexOf('Another Dat was already downloaded here') > -1
      if (!contains || !share) return false
      downloaderTwo.kill()
      return true
    }, 'download two errored')
    downloaderTwo.end(function () {
      t.end()
    })
  }
})

test('download transfers files', function (t) {
  var link
  var tmpdir = newTestFolder()
  rimraf.sync(path.join(process.cwd(), '.dat')) // this keeps ending up here
  rimraf.sync(path.join(fixtures, '.dat'))

  var share = spawn(t, dat + ' ' + fixtures, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    var matches = matchDatLink(output)
    if (!matches) return false
    link = matches
    startDownloader()
    return true
  }, 'share started')

  function startDownloader () {
    var downloader = spawn(t, dat + ' ' + link + ' ' + tmpdir, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !share) return false

      var hasFiles = output.indexOf('2 items') > -1
      t.ok(hasFiles, 'file number is 2')

      var hasSize = output.indexOf('1.44 kB') > -1
      t.ok(hasSize, 'has size')

      var hasLink = output.indexOf(link) > -1
      t.ok(hasLink, 'has link')

      var fileList = fs.readdirSync(tmpdir).join(' ')
      var hasCsvFile = fileList.indexOf('all_hour.csv') > -1
      var hasDatFolder = fileList.indexOf('.dat') > -1
      t.ok(hasDatFolder, '.dat folder created')
      t.ok(hasCsvFile, 'csv file downloaded')
      var hasSubDir = fileList.indexOf('folder') > -1
      t.skip(hasSubDir, 'TODO: sub directory downloaded')
      // var hasEmtpy = fileList.indexOf('empty') > -1
      // t.ok(hasEmtpy, 'empty file downloaded')
      // TODO: known hyperdrive issue https://github.com/mafintosh/hyperdrive/issues/83

      downloader.kill()
      share.kill()
      return true
    }, 'download finished')
    downloader.end(function () {
      t.end()
    })
  }
})

process.on('exit', function () {
  console.log('cleaning up')
  rimraf.sync(downloadDir)
})

function newTestFolder () {
  var tmpdir = path.join(os.tmpdir(), 'dat-download-folder')
  rimraf.sync(tmpdir)
  mkdirp.sync(tmpdir)
  return tmpdir
}

function matchDatLink (output) {
  // TODO: dat.land links
  var match = output.match(/Link: [A-Za-z0-9]{64}/)
  if (!match) return false
  return match[0].split('Link: ')[1].trim()
}
