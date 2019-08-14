const path = require('path')
const test = require('tape')
const tempDir = require('temporary-directory')
const spawn = require('./helpers/spawn.js')
const help = require('./helpers')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))

test('pull - errors without clone first', function (t) {
  tempDir(function (_, dir, cleanup) {
    const cmd = dat + ' pull'
    const st = spawn(t, cmd, { cwd: dir })
    st.stderr.match(function (output) {
      t.ok('No existing archive', 'Error: no existing archive')
      st.kill()
      return true
    })
    st.end(cleanup)
  })
})

test('pull - default opts', function (t) {
  // import false so we can pull files later
  help.shareFixtures({ import: false }, function (_, fixturesDat) {
    tempDir(function (_, dir, cleanup) {
      // clone initial dat
      const cmd = dat + ' clone ' + fixturesDat.key.toString('hex') + ' ' + dir
      const st = spawn(t, cmd, { end: false })
      st.stdout.match(function (output) {
        const synced = output.indexOf('dat synced') > -1
        if (!synced) return false
        st.kill()
        fixturesDat.close(doPull)
        return true
      })

      function doPull () {
        // TODO: Finish this one. Need some bug fixes on empty pulls =(
        help.shareFixtures({ resume: true, import: true }, function (_, fixturesDat) {
          const cmd = dat + ' pull'
          const st = spawn(t, cmd, { cwd: dir })
          st.stdout.match(function (output) {
            const downloadFinished = output.indexOf('dat sync') > -1
            if (!downloadFinished) return false
            st.kill()
            return true
          })
          st.succeeds('exits after finishing download')
          st.stderr.empty()
          st.end(function () {
            fixturesDat.close()
          })
        })
      }
    })
  })
})

// test('pull - default opts', function (t) {
//   // cmd: dat pull
//   // import the files to the sharer so we can pull new data
//   shareDat.importFiles(function (err) {
//     if (err) throw err

//     const datDir = path.join(baseTestDir, shareKey)
//     const cmd = dat + ' pull'
//     const st = spawn(t, cmd, {cwd: datDir})
//     st.stdout.match(function (output) {
//       const downloadFinished = output.indexOf('Download Finished') > -1
//       if (!downloadFinished) return false

//       const stats = shareDat.stats.get()
//       const fileRe = new RegExp(stats.filesTotal + ' files')
//       const bytesRe = new RegExp(/1\.\d{1,2} kB/)

//       t.ok(help.matchLink(output), 'prints link')
//       t.ok(output.indexOf('dat-download-folder/' + shareKey) > -1, 'prints dir')
//       t.ok(output.match(fileRe), 'total size: files okay')
//       t.ok(output.match(bytesRe), 'total size: bytes okay')
//       t.ok(help.isDir(datDir), 'creates download directory')

//       const fileList = help.fileList(datDir).join(' ')
//       const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
//       t.ok(hasCsvFile, 'csv file downloaded')
//       const hasDatFolder = fileList.indexOf('.dat') > -1
//       t.ok(hasDatFolder, '.dat folder created')
//       const hasSubDir = fileList.indexOf('folder') > -1
//       t.ok(hasSubDir, 'folder created')
//       const hasNestedDir = fileList.indexOf('nested') > -1
//       t.ok(hasNestedDir, 'nested folder created')
//       const hasHelloFile = fileList.indexOf('hello.txt') > -1
//       t.ok(hasHelloFile, 'hello.txt file downloaded')

//       st.kill()
//       return true
//     })
//     st.succeeds('exits after finishing download')
//     st.stderr.empty()
//     st.end()
//   })
// })

// test('pull - with dir arg', function (t) {
//   const dirName = shareKey
//   const datDir = path.join(baseTestDir, shareKey)
//   const cmd = dat + ' pull ' + dirName
//   const st = spawn(t, cmd, {cwd: baseTestDir})
//   st.stdout.match(function (output) {
//     const downloadFinished = output.indexOf('Download Finished') > -1
//     if (!downloadFinished) return false

//     t.ok(output.indexOf('dat-download-folder/' + dirName) > -1, 'prints dir')
//     t.ok(help.isDir(datDir), 'creates download directory')

//     st.kill()
//     return true
//   })
//   st.succeeds('exits after finishing download')
//   st.stderr.empty()
//   st.end()
// })
