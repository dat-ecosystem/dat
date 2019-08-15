const fs = require('fs')
const path = require('path')
const test = require('tape')
const tempDir = require('temporary-directory')
const spawn = require('./helpers/spawn.js')
const help = require('./helpers')

const dat = path.resolve(path.join(__dirname, '..', 'bin', 'cli.js'))

test('clone - default opts', t => {
  help.shareFixtures((_, shareDat) => {
    const key = shareDat.key.toString('hex')
    tempDir((_, dir, cleanup) => {
      const cmd = dat + ' clone ' + key
      const st = spawn(t, cmd, { cwd: dir })
      const datDir = path.join(dir, key)

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const stats = shareDat.stats.get()
        const fileRe = new RegExp(stats.files + ' files')
        const bytesRe = new RegExp(/1\.\d KB/)

        t.ok(output.match(fileRe), 'total size: files okay')
        t.ok(output.match(bytesRe), 'total size: bytes okay')
        t.ok(help.isDir(datDir), 'creates download directory')

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

// Right now we aren't forcing this
// test('clone - errors on existing dir', t => {
//   tempDir((_, dir, cleanup) => {
//     // make empty dat in directory
//     Dat(dir, (err, shareDat) => {
//       t.error(err, 'no error')
//       // Try to clone to same dir
//       shareDat.close(() => {
//         const cmd = dat + ' clone ' + shareDat.key.toString('hex') + ' ' + dir
//         const st = spawn(t, cmd)
//         st.stdout.empty()
//         st.stderr.match(output => {
//           t.same(output.trim(), 'Existing archive in this directory. Use pull or sync to update.', 'Existing archive.')
//           st.kill()
//           return true
//         })
//         st.end(cleanup)
//       })
//     })
//   })
// })

test('clone - specify dir', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const key = shareDat.key.toString('hex')
      const customDir = 'my_dir'
      const cmd = dat + ' clone ' + key + ' ' + customDir
      const st = spawn(t, cmd, { cwd: dir })
      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        t.ok(help.isDir(path.join(dir, customDir)), 'creates download directory')
        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - dat:// link', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const key = 'dat://' + shareDat.key.toString('hex') + '/'
      const cmd = dat + ' clone ' + key + ' '
      const downloadDir = path.join(dir, shareDat.key.toString('hex'))
      const st = spawn(t, cmd, { cwd: dir })
      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        t.ok(help.isDir(path.join(downloadDir)), 'creates download directory')
        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - datproject.org/key link', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const key = 'datproject.org/' + shareDat.key.toString('hex') + '/'
      const cmd = dat + ' clone ' + key + ' '
      const downloadDir = path.join(dir, shareDat.key.toString('hex'))
      const st = spawn(t, cmd, { cwd: dir })
      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        t.ok(help.isDir(path.join(downloadDir)), 'creates download directory')
        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

// TODO: fix --temp for clones
// test('clone - with --temp', t => {
//   // cmd: dat clone <link>
//   help.shareFixtures((_, fixturesDat) => {
//     shareDat = fixturesDat
//     const key = shareDat.key.toString('hex')
//     const cmd = dat + ' clone ' + key + ' --temp'
//     const st = spawn(t, cmd, {cwd: baseTestDir})
//     const datDir = path.join(baseTestDir, key)
//     st.stdout.match(output => {
//       const downloadFinished = output.indexOf('Download Finished') > -1
//       if (!downloadFinished) return false

//       const stats = shareDat.stats.get()
//       const fileRe = new RegExp(stats.filesTotal + ' files')
//       const bytesRe = new RegExp(/1\.\d{1,2} kB/)

//       t.ok(help.matchLink(output), 'prints link')
//       t.ok(output.indexOf('dat-download-folder/' + key) > -1, 'prints dir')
//       t.ok(output.match(fileRe), 'total size: files okay')
//       t.ok(output.match(bytesRe), 'total size: bytes okay')
//       t.ok(help.isDir(datDir), 'creates download directory')

//       const fileList = help.fileList(datDir).join(' ')
//       const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
//       t.ok(hasCsvFile, 'csv file downloaded')
//       const hasDatFolder = fileList.indexOf('.dat') > -1
//       t.ok(!hasDatFolder, '.dat folder not created')
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

test('clone - invalid link', t => {
  const key = 'best-key-ever'
  const cmd = dat + ' clone ' + key
  tempDir((_, dir, cleanup) => {
    const st = spawn(t, cmd, { cwd: dir })
    const datDir = path.join(dir, key)
    st.stderr.match(output => {
      const error = output.indexOf('Could not resolve link') > -1
      if (!error) return false
      t.ok(error, 'has error')
      t.ok(!help.isDir(datDir), 'download dir removed')
      st.kill()
      return true
    })
    st.end(cleanup)
  })
})

test('clone - shortcut/stateless clone', t => {
  help.shareFixtures((_, shareDat) => {
    const key = shareDat.key.toString('hex')
    tempDir((_, dir, cleanup) => {
      const datDir = path.join(dir, key)
      const cmd = dat + ' ' + key + ' ' + datDir + ' --exit'
      const st = spawn(t, cmd)

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        t.ok(help.isDir(datDir), 'creates download directory')

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

// TODO: fix this
// test('clone - hypercore link', t => {
//   help.shareFeed((_, key, close) => {
//     tempDir((_, dir, cleanup) => {
//       const cmd = dat + ' clone ' + key
//       const st = spawn(t, cmd, {cwd: dir})
//       const datDir = path.join(dir, key)
//       st.stderr.match(output => {
//         const error = output.indexOf('not a Dat Archive') > -1
//         if (!error) return false
//         t.ok(error, 'has error')
//         t.ok(!help.isDir(datDir), 'download dir removed')
//         st.kill()
//         return true
//       })
//       st.end(() => {
//         cleanup()
//         close()
//       })
//     })
//   })
// })

test('clone - specify directory containing dat.json', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      fs.writeFileSync(path.join(dir, 'dat.json'), JSON.stringify({ url: shareDat.key.toString('hex') }), 'utf8')

      // dat clone /dir
      const cmd = dat + ' clone ' + dir
      const st = spawn(t, cmd)
      const datDir = dir

      st.stdout.match((output) => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - specify directory containing dat.json with cwd', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      fs.writeFileSync(path.join(dir, 'dat.json'), JSON.stringify({ url: shareDat.key.toString('hex') }), 'utf8')

      // cd dir && dat clone /dir/dat.json
      const cmd = dat + ' clone ' + dir
      const st = spawn(t, cmd, { cwd: dir })
      const datDir = dir

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - specify dat.json path', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const datJsonPath = path.join(dir, 'dat.json')
      fs.writeFileSync(datJsonPath, JSON.stringify({ url: shareDat.key.toString('hex') }), 'utf8')

      // dat clone /dir/dat.json
      const cmd = dat + ' clone ' + datJsonPath
      const st = spawn(t, cmd)
      const datDir = dir

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - specify dat.json path with cwd', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const datJsonPath = path.join(dir, 'dat.json')
      fs.writeFileSync(datJsonPath, JSON.stringify({ url: shareDat.key.toString('hex') }), 'utf8')

      // cd /dir && dat clone /dir/dat.json
      const cmd = dat + ' clone ' + datJsonPath
      const st = spawn(t, cmd, { cwd: dir })
      const datDir = dir

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})

test('clone - specify dat.json + directory', t => {
  help.shareFixtures((_, shareDat) => {
    tempDir((_, dir, cleanup) => {
      const datDir = path.join(dir, 'clone-dest')
      const datJsonPath = path.join(dir, 'dat.json') // make dat.json in different dir

      fs.mkdirSync(datDir)
      fs.writeFileSync(datJsonPath, JSON.stringify({ url: shareDat.key.toString('hex') }), 'utf8')

      // dat clone /dir/dat.json /dir/clone-dest
      const cmd = dat + ' clone ' + datJsonPath + ' ' + datDir
      const st = spawn(t, cmd)

      st.stdout.match(output => {
        const downloadFinished = output.indexOf('Exiting') > -1
        if (!downloadFinished) return false

        const fileList = help.fileList(datDir).join(' ')
        const hasCsvFile = fileList.indexOf('all_hour.csv') > -1
        t.ok(hasCsvFile, 'csv file downloaded')
        const hasDatFolder = fileList.indexOf('.dat') > -1
        t.ok(hasDatFolder, '.dat folder created')
        const hasSubDir = fileList.indexOf('folder') > -1
        t.ok(hasSubDir, 'folder created')
        const hasNestedDir = fileList.indexOf('nested') > -1
        t.ok(hasNestedDir, 'nested folder created')
        const hasHelloFile = fileList.indexOf('hello.txt') > -1
        t.ok(hasHelloFile, 'hello.txt file downloaded')

        st.kill()
        return true
      })
      st.succeeds('exits after finishing download')
      st.stderr.empty()
      st.end(() => {
        cleanup()
        shareDat.close()
      })
    })
  })
})
