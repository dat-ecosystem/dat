const fs = require('fs')
const path = require('path')
const test = require('tape')
const tempDir = require('temporary-directory')
const Dat = require('dat-node')
const spawn = require('./helpers/spawn.js')
const help = require('./helpers')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))
const fixtures = path.join(__dirname, 'fixtures')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(fixtures, '.DS_Store')) } catch (e) { /* ignore error */ }

// start without dat.json
try { fs.unlinkSync(path.join(fixtures, 'dat.json')) } catch (e) { /* ignore error */ }

test('create - default opts no import', t => {
  tempDir((_, dir, cleanup) => {
    const cmd = dat + ' create --title data --description thing'
    const st = spawn(t, cmd, { cwd: dir })

    st.stdout.match(output => {
      const datCreated = output.indexOf('Created empty Dat') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - errors on existing archive', t => {
  tempDir((_, dir, cleanup) => {
    Dat(dir, (err, dat) => {
      t.error(err, 'no error')
      dat.close(() => {
        const cmd = dat + ' create --title data --description thing'
        const st = spawn(t, cmd, { cwd: dir })
        st.stderr.match(output => {
          t.ok(output, 'errors')
          st.kill()
          return true
        })
        st.end()
      })
    })
  })
})

test('create - sync after create ok', t => {
  tempDir((_, dir, cleanup) => {
    const cmd = dat + ' create --title data --description thing'
    const st = spawn(t, cmd, { cwd: dir, end: false })
    st.stdout.match(output => {
      const connected = output.indexOf('Created empty Dat') > -1
      if (!connected) return false
      doSync()
      return true
    })

    function doSync () {
      const cmd = dat + ' sync '
      const st = spawn(t, cmd, { cwd: dir })

      st.stdout.match(output => {
        const connected = output.indexOf('Sharing') > -1
        if (!connected) return false
        st.kill()
        return true
      })
      st.stderr.empty()
      st.end(cleanup)
    }
  })
})

test('create - init alias', t => {
  tempDir((_, dir, cleanup) => {
    const cmd = dat + ' init --title data --description thing'
    const st = spawn(t, cmd, { cwd: dir })

    st.stdout.match(output => {
      const datCreated = output.indexOf('Created empty Dat') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})

test('create - with path', t => {
  tempDir((_, dir, cleanup) => {
    const cmd = dat + ' init ' + dir + ' --title data --description thing'
    const st = spawn(t, cmd)
    st.stdout.match(output => {
      const datCreated = output.indexOf('Created empty Dat') > -1
      if (!datCreated) return false

      t.ok(help.isDir(path.join(dir, '.dat')), 'creates dat directory')

      st.kill()
      return true
    })
    st.succeeds('exits after create finishes')
    st.stderr.empty()
    st.end(cleanup)
  })
})
