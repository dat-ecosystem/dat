var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var spawn = require('./helpers/spawn.js')
var help = require('./helpers')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var baseTestDir = help.testFolder()
var shareDat
var shareKey

test('pull - errors without clone first', function (t) {
  // cmd: dat pull
  var cmd = dat + ' pull'
  var st = spawn(t, cmd, {cwd: baseTestDir})
  st.stderr.match(function (output) {
    t.ok('No existing archive', 'Error: no existing archive')
    st.kill()
    return true
  })
  st.stdout.empty()
  st.end()
})

test('pull - clone so we can pull', function (t) {
  // cmd: dat clone <link>
  // import false so we can pull files later
  help.shareFixtures({import: false}, function (_, fixturesDat) {
    shareDat = fixturesDat
    shareKey = shareDat.key.toString('hex')
    var cmd = dat + ' clone ' + shareKey
    var st = spawn(t, cmd, {cwd: baseTestDir})
    st.stdout.match(function (output) {
      var downloadFinished = output.indexOf('Download Finished') > -1
      if (!downloadFinished) return false
      st.kill()
      return true
    })
    st.stderr.empty()
    st.end()
  })
})

test('pull - default opts', function (t) {
  // cmd: dat pull
  // import the files to the sharer so we can pull new data
  shareDat.importFiles(function (err) {
    if (err) throw err

    var datDir = path.join(baseTestDir, shareKey)
    var cmd = dat + ' pull'
    var st = spawn(t, cmd, {cwd: datDir})
    st.stdout.match(function (output) {
      var downloadFinished = output.indexOf('Download Finished') > -1
      if (!downloadFinished) return false

      var stats = shareDat.stats.get()
      var fileRe = new RegExp(stats.filesTotal + ' files')
      var bytesRe = new RegExp(/1\.\d{1,2} kB/)

      t.ok(help.matchLink(output), 'prints link')
      t.ok(output.indexOf('dat-download-folder/' + shareKey) > -1, 'prints dir')
      t.ok(output.match(fileRe), 'total size: files okay')
      t.ok(output.match(bytesRe), 'total size: bytes okay')
      t.ok(help.isDir(datDir), 'creates download directory')

      var fileList = help.fileList(datDir).join(' ')
      var hasCsvFile = fileList.indexOf('all_hour.csv') > -1
      t.ok(hasCsvFile, 'csv file downloaded')
      var hasDatFolder = fileList.indexOf('.dat') > -1
      t.ok(hasDatFolder, '.dat folder created')
      var hasSubDir = fileList.indexOf('folder') > -1
      t.ok(hasSubDir, 'folder created')
      var hasNestedDir = fileList.indexOf('nested') > -1
      t.ok(hasNestedDir, 'nested folder created')
      var hasHelloFile = fileList.indexOf('hello.txt') > -1
      t.ok(hasHelloFile, 'hello.txt file downloaded')

      st.kill()
      return true
    })
    st.succeeds('exits after finishing download')
    st.stderr.empty()
    st.end()
  })
})

test('pull - with dir arg', function (t) {
  var dirName = shareKey
  var datDir = path.join(baseTestDir, shareKey)
  var cmd = dat + ' pull ' + dirName
  var st = spawn(t, cmd, {cwd: baseTestDir})
  st.stdout.match(function (output) {
    var downloadFinished = output.indexOf('Download Finished') > -1
    if (!downloadFinished) return false

    t.ok(output.indexOf('dat-download-folder/' + dirName) > -1, 'prints dir')
    t.ok(help.isDir(datDir), 'creates download directory')

    st.kill()
    return true
  })
  st.succeeds('exits after finishing download')
  st.stderr.empty()
  st.end()
})

test('close sharer', function (t) {
  shareDat.close(function () {
    rimraf.sync(path.join(shareDat.path, '.dat'))
    t.end()
  })
})

test.onFinish(function () {
  rimraf.sync(baseTestDir)
})
