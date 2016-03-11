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
    var matches = output.match(/dat\:\/\/[A-Za-z0-9]+/)
    if (!matches) return false
    dat1link = matches[0]
    st.kill()
    return true
  })
  st.end()
})

test('link with no args defaults to cwd', function (t) {
  var st = spawn(t, dat + ' link --home=' + tmp, {cwd: dat1})
  st.stdout.match(function (output) {
    var contains = output.indexOf('dat://') > -1
    if (!contains) return false
    t.ok(output.toString().indexOf(dat1link) > -1, 'links match')
    st.kill()
    return true
  })
  st.end()
})

test('link with . arg defaults to cwd', function (t) {
  var st = spawn(t, dat + ' link . --home=' + tmp, {cwd: dat1})
  st.stdout.match(function (output) {
    var contains = output.indexOf('dat://') > -1
    if (!contains) return false
    t.ok(output.toString().indexOf(dat1link) > -1, 'links match')
    st.kill()
    return true
  })
  st.end()
})

test('link with dat uri suggests correct usage', function (t) {
  var st = spawn(t, dat + ' link dat://deadbeefcafe')
  st.stderr.match(function (output) {
    t.equal(output, 'Do you mean `dat dat://deadbeefcafe` ?\n')
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
  linker.stderr.empty()
  linker.stdout.match(function (output) {
    var matches = output.match(/dat\:\/\/[A-Za-z0-9]+/)
    if (!matches) return false
    link = matches[0]
    linker.kill()
    return true
  })
  linker.end(function () {
    t.true(linker.proc.killed, 'first link process is killed')
    startClone()
  })

  function startClone () {
    var cloner = spawn(t, dat + ' ' + link + ' --home=' + tmp + ' --path=' + dat2, {end: false})
    cloner.timeout(10000, 'waited 10 seconds and download didnt start')

    cloner.stdout.match(function (output) {
      var str = output.toString()
      if (relinker && str.indexOf('Downloaded') > -1) {
        cloner.kill()
        relinker.kill()
        relinker.end()
        return true
      }

      return false
    })
    cloner.end(function () {
      t.end()
    })

    var relinker = startRelinking()
  }

  function startRelinking () {
    var relinker = spawn(t, dat + ' link --home=' + tmp + ' --path=' + dat1, {end: false})
    return relinker
  }
})

rimraf.sync(path.join(tmp, '.dat'))
