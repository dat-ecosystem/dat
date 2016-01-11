var os = require('os')
var fs = require('fs')
var path = require('path')
var test = require('tape')
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
    t.equal(output.length, 70, 'version is length 70: dat:// + 64 char hash')
    dat1link = output.toString()
    st.kill()
    return true
  })
  st.end()
})

test('link with no args defaults to cwd', function (t) {
  var st = spawn(t, dat + ' link --home=' + tmp, {cwd: dat1})
  st.stdout.match(function (output) {
    t.equal(output.length, 70, 'version is length 70: dat:// + 64 char hash')
    t.equal(output.toString(), dat1link, 'links match')
    st.kill()
    return true
  })
  st.end()
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
  linker.stdout.match(function (output) {
    var matched = output.length === 70
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
        relinker.end()
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
    relinker.stdout.match(function (output) {
      return true // ignore output
    })
    return relinker
  }
})

rimraf.sync(path.join(tmp, '.dat'))
