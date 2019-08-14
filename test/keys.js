const fs = require('fs')
const path = require('path')
const test = require('tape')
const rimraf = require('rimraf')
const tempDir = require('temporary-directory')
const spawn = require('./helpers/spawn.js')
const help = require('./helpers')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
const fixtures = path.join(__dirname, 'fixtures')

test('keys - print keys', function (t) {
  help.shareFixtures(function (_, shareDat) {
    shareDat.close(function () {
      const cmd = dat + ' keys '
      const st = spawn(t, cmd, { cwd: fixtures })

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
      const cmd = dat + ' keys --discovery'
      const st = spawn(t, cmd, { cwd: fixtures })

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
      const key = shareDat.key.toString('hex')
      tempDir(function (_, dir, cleanup) {
        const cmd = dat + ' clone ' + key
        const st = spawn(t, cmd, { cwd: dir, end: false })
        const datDir = path.join(dir, key)

        st.stdout.match(function (output) {
          const downloadFinished = output.indexOf('Exiting') > -1
          if (!downloadFinished) return false
          st.kill()
          shareDat.close(exchangeKeys)
          return true
        })
        st.stderr.empty()

        function exchangeKeys () {
          let secretKey = null

          const exportKey = dat + ' keys export'
          const st = spawn(t, exportKey, { cwd: fixtures, end: false })
          st.stdout.match(function (output) {
            if (!output) return false
            secretKey = output.trim()
            st.kill()
            importKey()
            return true
          })
          st.stderr.empty()

          function importKey () {
            const exportKey = dat + ' keys import'
            const st = spawn(t, exportKey, { cwd: datDir })
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
