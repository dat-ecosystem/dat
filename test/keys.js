var fs = require('fs')
var path = require('path')
var test = require('tape')
var rimraf = require('rimraf')
var tempDir = require('temporary-directory')
var spawn = require('./helpers/spawn.js')
var help = require('./helpers')

var dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
var fixtures = path.join(__dirname, 'fixtures')

test('keys - print keys', function (t) {
  help.shareFixtures(function (_, shareDat) {
    shareDat.close(function () {
      var cmd = dat + ' keys '
      var st = spawn(t, cmd, { cwd: fixtures })

      st.stdout.match(function (output) {
        if (output.indexOf('dat://') === -1) return false
        t.ok(output.indexOf(shareDat.key.toString('hex') > -1), 'prints key')
        st.kill()
        return true
      })
      st.stderr.empty()
      st.end()
    })
  })
})

test('keys - print discovery key', function (t) {
  help.shareFixtures(function (_, shareDat) {
    shareDat.close(function () {
      var cmd = dat + ' keys --discovery'
      var st = spawn(t, cmd, { cwd: fixtures })

      st.stdout.match(function (output) {
        if (output.indexOf('Discovery') === -1) return false
        t.ok(output.indexOf(shareDat.key.toString('hex') > -1), 'prints key')
        t.ok(output.indexOf(shareDat.archive.discoveryKey.toString('hex') > -1), 'prints discovery key')
        st.kill()
        return true
      })
      st.stderr.empty()
      st.end()
    })
  })
})

if (!process.env.TRAVIS) {
  test('keys - export & import secret key', function (t) {
    help.shareFixtures(function (_, shareDat) {
      var key = shareDat.key.toString('hex')
      tempDir(function (_, dir, cleanup) {
        var cmd = dat + ' clone ' + key
        var st = spawn(t, cmd, { cwd: dir, end: false })
        var datDir = path.join(dir, key)

        st.stdout.match(function (output) {
          var downloadFinished = output.indexOf('Exiting') > -1
          if (!downloadFinished) return false
          st.kill()
          shareDat.close(exchangeKeys)
          return true
        })
        st.stderr.empty()

        function exchangeKeys () {
          var secretKey = null

          var exportKey = dat + ' keys export'
          var st = spawn(t, exportKey, { cwd: fixtures, end: false })
          st.stdout.match(function (output) {
            if (!output) return false
            secretKey = output.trim()
            st.kill()
            importKey()
            return true
          })
          st.stderr.empty()

          function importKey () {
            var exportKey = dat + ' keys import'
            var st = spawn(t, exportKey, { cwd: datDir })
            st.stdout.match(function (output) {
              if (!output.indexOf('secret key') === -1) return false
              st.stdin.write(secretKey + '\r')
              if (output.indexOf('Successful import') === -1) return false
              t.ok(fs.statSync(path.join(datDir, '.dat', 'metadata.ogd')), 'original dat file exists')
              st.kill()
              return true
            })
            st.stderr.empty()
            st.end(function () {
              rimraf.sync(path.join(fixtures, '.dat'))
              cleanup()
            })
          }
        }
      })
    })
  })
}
