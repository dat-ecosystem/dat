var os = require('os')
var fs = require('fs')
var path = require('path')
var test = require('tape')
var after = require('after')
var rimraf = require('rimraf')
var mkdirp = require('mkdirp')

var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var dat1 = path.join(__dirname, 'fixtures')
var tmp = os.tmpdir()
var dat1link

test('prints link', function (t) {
  var st = spawn(t, dat + ' link ' + dat1 + ' --home=' + tmp)
  st.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    dat1link = output.toString()
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('link with no args defaults to cwd', function (t) {
  var st = spawn(t, dat + ' link --home=' + tmp, {cwd: dat1})
  st.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    t.equal(output.toString(), dat1link, 'links match')
    st.kill()
    return true
  })
  st.stderr.empty()
  st.end()
})

test('prints link and stays open for download', function (t) {
  var link, download
  var share = spawn(t, dat + ' link ' + dat1 + ' --home=' + tmp, {end: false})
  share.stderr.empty()
  share.stdout.match(function (output) {
    t.equal(output.length, 71, 'version is length 71: dat:// + 64 char hash + newline')
    link = output.trim()
    download = spawn(t, dat + ' ' + link + ' --path=' + tmp + ' --home=' + tmp, {end: false})
    var line = 0
    download.stderr.empty()
    download.stdout.match(function (output) {
      output = output.split('\n')[line]
      line += 1
      if (output === 'Done downloading.') {
        download.kill()
        share.kill()
        cleanup()
        return true
      }
    })
    return true
  })
  function cleanup () {
    var next = after(2, t.end.bind(t))
    share.end(next)
    download.end(next)
  }
})

test('connects if link process starts second', function (t) {
  var link
  var tmpdir = tmp + '/dat-link-restart-test'
  rimraf.sync(tmpdir)
  var dat1 = tmpdir + '/dat1'
  var dat2 = tmpdir + '/dat2'
  mkdirp.sync(dat1)
  mkdirp.sync(dat2)

  fs.writeFileSync(dat1 + '/foo.txt', new Buffer('hello world'))
  var linkCmd = dat + ' link --home=' + tmp + ' --path=' + dat1
  var linker = spawn(t, linkCmd, {end: false})
  linker.stderr.empty()
  linker.stdout.match(function (output) {
    var matched = output.length === 71
    t.ok(matched, 'got link from ' + dat1)
    link = output.toString().trim()
    linker.kill()
    if (matched) return true
    else return false
  })
  linker.end(function () {
    t.true(linker.proc.killed, 'first link process is killed')
    startClone()
  })

  function startClone () {
    var relinked = false
    var relinker
    var cloner = spawn(t, dat + ' ' + link + ' --home=' + tmp + ' --path=' + dat2, {end: false})
    cloner.timeout(10000, 'waited 10 seconds and download didnt start')
    cloner.stderr.empty()
    cloner.stdout.match(function (output) {
      var str = output.toString()

      if (relinked && str.indexOf('Done downloading.') > -1) {
        cloner.kill()
        relinker.kill()
        return true
      }

      if (str.indexOf('Downloading') > -1) {
        t.ok(true, 'running "dat ' + link + '" in ' + dat2)
        if (!relinked) {
          relinker = startRelinking()
          relinked = true
        }
        return false
      }

      return false
    })
    cloner.end(function () {
      t.end()
    })
  }

  function startRelinking () {
    var relinker = spawn(t, dat + ' link --home=' + tmp + ' --path=' + dat1, {end: false})
    relinker.stderr.empty()
    relinker.stdout.match(function (output) {
      t.equal(output.length, 71, 'running "dat link" in ' + dat1)
      return true
    })
    relinker.end(function () {
      console.log('relinker ended')
    })
    return relinker
  }
})

rimraf.sync(path.join(tmp, '.dat'))
