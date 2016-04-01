var os = require('os')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var tmp = os.tmpdir()

var datFixtures = path.join(__dirname, 'fixtures')
var FIXTURES_HASH = '34739817d7061aaf5f9ca82fcc443ecf5c77f0f2dcf61ae86dec4aeb02c39ff9'

test('errors with non 64 character hashes', function (t) {
  var st = spawn(t, dat + ' pizza . --home=' + tmp)
  st.stderr.match(function (output) {
    var gotError = output.indexOf('Invalid dat link') > -1
    t.ok(gotError, 'got error')
    if (gotError) return true
  })
  st.end()
})

test('does not error with 64 character link', function (t) {
  var st = spawn(t, dat + ' ' + FIXTURES_HASH + ' . --home=' + tmp)
  st.stdout.match(function (output) {
    var downloading = output.indexOf('Finding data sources') > -1
    if (!downloading) return false
    t.ok(downloading, output + ' contains "Finding data sources"')
    if (downloading) {
      st.kill()
      return true
    }
  })
  st.end()
})

test('does not error with 64 character link with dat:// in front', function (t) {
  var st = spawn(t, dat + ' dat://' + FIXTURES_HASH + ' . --home=' + tmp)
  st.stdout.match(function (output) {
    var downloading = output.indexOf('Finding data sources') > -1
    if (!downloading) return false
    t.ok(downloading, output + ' contains "Finding data sources"')
    if (downloading) {
      st.kill()
      return true
    }
  })
  st.end()
})

// this test just downloads an empty dat
test('download shows folder name on completion', function (t) {
  var link
  var tmpdir = tmp + '/dat-download-folder-test'
  rimraf.sync(tmpdir)
  var datFolderName = 'dat1'
  var dat1 = tmpdir + '/' + datFolderName
  var dat2 = tmpdir + '/dat2'
  mkdirp.sync(dat1)
  mkdirp.sync(dat2)

  var linkCmd = dat + ' link --home=' + tmp + ' --path=' + dat1
  var linker = spawn(t, linkCmd, {end: false})
  linker.stderr.empty()
  linker.stdout.match(function (output) {
    var matches = output.match(/dat\:\/\/[A-Za-z0-9]+/)
    if (!matches) return false
    link = matches[0]
    startDownloader()
    return true
  })

  function startDownloader () {
    var downloader = spawn(t, dat + ' ' + link + ' --home=' + tmp + ' --path=' + dat2, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !linker) return false
      downloader.kill()
      linker.kill()
      return true
    })
    downloader.end(function () {
      t.end()
    })
  }
})

test('download metadata is correct', function (t) {
  var link
  var tmpdir = tmp + '/dat-download-folder-test'
  rimraf.sync(tmpdir)
  var dat1 = tmpdir + '/dat2'
  mkdirp.sync(dat1)

  var linkCmd = dat + ' link --home=' + tmp + ' --path=' + datFixtures
  var linker = spawn(t, linkCmd, {end: false})
  linker.stderr.empty()
  linker.stdout.match(function (output) {
    var matches = output.match(/dat\:\/\/[A-Za-z0-9]+/)
    if (!matches) return false
    link = matches[0]
    startDownloader()
    return true
  })

  function startDownloader () {
    var downloader = spawn(t, dat + ' ' + link + ' --home=' + tmp + ' --path=' + dat1, {end: false})
    downloader.stdout.match(function (output) {
      var contains = output.indexOf('Downloaded') > -1
      if (!contains || !linker) return false

      var stats = output.split('(')[1]
      var fileNum = stats.match(/\d+/g)[0]
      var dirNum = stats.match(/\d+/g)[1]
      t.equal(Number(fileNum), 2, 'file number is 2')
      t.equal(Number(dirNum), 2, 'directory number is 2')

      var hasSizeDest = output.indexOf('Downloaded 1.44 kB') > -1
      t.ok(hasSizeDest, 'has size and destination')

      var hasLink = output.indexOf('dat://' + FIXTURES_HASH) > -1
      t.ok(hasLink, 'has link')
      if (!hasLink) console.error('no link!' + output)

      downloader.kill()
      linker.kill()
      return true
    })
    downloader.end(function () {
      t.end()
    })
  }
})
