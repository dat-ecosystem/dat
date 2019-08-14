const test = require('tape')
const path = require('path')
const fs = require('fs')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const spawn = require('./helpers/spawn')
const help = require('./helpers')
const authServer = require('./helpers/auth-server')

let dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
const baseTestDir = help.testFolder()
const fixtures = path.join(__dirname, 'fixtures')

const port = process.env.PORT || 3000
const SERVER = 'http://localhost:' + port
const config = path.join(__dirname, '.datrc-test')
const opts = ' --server=' + SERVER + ' --config=' + config

dat += opts
rimraf.sync(config)

authServer(port, function (err, server, closeServer) {
  if (err) throw err
  if (!server) return
  test('auth - whoami works when not logged in', function (t) {
    const cmd = dat + ' whoami '
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stderr.match(function (output) {
      t.same(output.trim(), 'Not logged in.', 'printed correct output')
      return true
    })
    st.stdout.empty()
    st.end()
  })

  test('auth - register works', function (t) {
    const cmd = dat + ' register --email=hello@bob.com --password=joe --username=joe'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stdout.match(function (output) {
      t.same(output.trim(), 'Registered successfully.', 'output success message')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - login works', function (t) {
    const cmd = dat + ' login --email=hello@bob.com --password=joe'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stdout.match(function (output) {
      t.same(output.trim(), 'Logged in successfully.', 'output success message')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - whoami works', function (t) {
    const cmd = dat + ' whoami'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stdout.match(function (output) {
      t.same('hello@bob.com', output.trim(), 'email printed')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - publish before create fails', function (t) {
    const cmd = dat + ' publish'
    rimraf.sync(path.join(fixtures, '.dat'))
    const st = spawn(t, cmd, { cwd: fixtures })
    st.stdout.empty()
    st.stderr.match(function (output) {
      t.ok(output.indexOf('existing') > -1, 'Create archive before pub')
      return true
    })
    st.end()
  })

  test('auth - create dat to publish', function (t) {
    rimraf.sync(path.join(fixtures, '.dat'))
    rimraf.sync(path.join(fixtures, 'dat.json'))
    const cmd = dat + ' create --no-import'
    const st = spawn(t, cmd, { cwd: fixtures })
    st.stdout.match(function (output) {
      const link = help.matchLink(output)
      if (!link) return false
      t.ok(link, 'prints link')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - publish our awesome dat', function (t) {
    const cmd = dat + ' publish --name awesome'
    const st = spawn(t, cmd, { cwd: fixtures })
    st.stdout.match(function (output) {
      const published = output.indexOf('Successfully published') > -1
      if (!published) return false
      t.ok(published, 'published')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - publish our awesome dat with bad dat.json url', function (t) {
    fs.readFile(path.join(fixtures, 'dat.json'), function (err, contents) {
      t.ifError(err)
      const info = JSON.parse(contents)
      const oldUrl = info.url
      info.url = info.url.replace('e', 'a')
      fs.writeFile(path.join(fixtures, 'dat.json'), JSON.stringify(info), function (err) {
        t.ifError(err, 'error after write')
        const cmd = dat + ' publish --name awesome'
        const st = spawn(t, cmd, { cwd: fixtures })
        st.stdout.match(function (output) {
          const published = output.indexOf('Successfully published') > -1
          if (!published) return false
          t.ok(published, 'published')
          t.same(help.datJson(fixtures).url, oldUrl, 'has dat.json with url')
          return true
        })
        st.stderr.empty()
        st.end()
      })
    })
  })

  test('auth - clone from registry', function (t) {
    // MAKE SURE THESE MATCH WHAT is published above
    // TODO: be less lazy and make a publish helper
    const shortName = 'localhost:' + port + '/joe/awesome' // they'll never guess who wrote these tests
    const baseDir = path.join(baseTestDir, 'dat_registry_dir')
    mkdirp.sync(baseDir)
    const downloadDir = path.join(baseDir, shortName.split('/').pop())
    const cmd = dat + ' clone ' + shortName
    const st = spawn(t, cmd, { cwd: baseDir })
    st.stdout.match(function (output) {
      const lookingFor = output.indexOf('Looking for') > -1
      if (!lookingFor) return false
      t.ok(lookingFor, 'starts looking for peers')
      t.ok(output.indexOf(downloadDir) > -1, 'prints dir')
      st.kill()
      return true
    })
    st.stderr.empty()
    st.end(function () {
      rimraf.sync(downloadDir)
    })
  })

  test('auth - publish our awesome dat without a dat.json file', function (t) {
    rimraf(path.join(fixtures, 'dat.json'), function (err) {
      t.ifError(err)
      const cmd = dat + ' publish --name another-awesome'
      const st = spawn(t, cmd, { cwd: fixtures })
      st.stdout.match(function (output) {
        const published = output.indexOf('Successfully published') > -1
        if (!published) return false
        t.ok(published, 'published')
        t.same(help.datJson(fixtures).name, 'another-awesome', 'has dat.json with name')
        return true
      })
      st.stderr.empty()
      st.end(function () {
        rimraf.sync(path.join(fixtures, '.dat'))
      })
    })
  })

  test('auth - bad clone from registry', function (t) {
    const shortName = 'localhost:' + port + '/joe/not-at-all-awesome'
    const baseDir = path.join(baseTestDir, 'dat_registry_dir_too')
    mkdirp.sync(baseDir)
    const downloadDir = path.join(baseDir, shortName.split('/').pop())
    const cmd = dat + ' clone ' + shortName
    const st = spawn(t, cmd, { cwd: baseDir })
    st.stderr.match(function (output) {
      t.same(output.trim(), 'Dat with that name not found.', 'not found')
      st.kill()
      return true
    })
    st.stdout.empty()
    st.end(function () {
      rimraf.sync(downloadDir)
    })
  })

  test('auth - logout works', function (t) {
    const cmd = dat + ' logout'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stdout.match(function (output) {
      t.same('Logged out.', output.trim(), 'output correct')
      return true
    })
    st.stderr.empty()
    st.end()
  })

  test('auth - logout prints correctly when trying to log out twice', function (t) {
    const cmd = dat + ' logout'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stderr.match(function (output) {
      t.same('Not logged in.', output.trim(), 'output correct')
      return true
    })
    st.stdout.empty()
    st.end()
  })

  test('auth - whoami works after logging out', function (t) {
    const cmd = dat + ' whoami'
    const st = spawn(t, cmd, { cwd: baseTestDir })
    st.stderr.match(function (output) {
      t.same('Not logged in.', output.trim())
      return true
    })
    st.stdout.empty()
    st.end()
  })

  test.onFinish(function () {
    closeServer(function () {
      fs.unlink(config, function () {
        // done!
      })
    })
  })
})
