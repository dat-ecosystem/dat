var fs = require('fs')
var os = require('os')
var path = require('path')

var test = require('tape')
var spawn = require('./helpers/spawn.js')
var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var tmp = os.tmpdir()
var datSample = path.join(__dirname, 'fixtures')

// os x adds this if you view the fixtures in finder and breaks the file count assertions
try { fs.unlinkSync(path.join(__dirname, 'fixtures', '.DS_Store')) } catch (e) { /* ignore error */ }

test('prints correct file & directory stats', function (t) {
  var st = spawn(t, dat + ' link ' + datSample + ' --home=' + tmp)
  st.stdout.match(function (output) {
    var datStats = output.indexOf('Creating Dat Link') > -1
    if (!datStats) return false

    var stats = output.split('(')[1]
    var fileNum = stats.match(/\d+/g)[0]
    var dirNum = stats.match(/\d+/g)[1]
    t.ok(Number(fileNum) === 2, 'file number is 2')
    t.ok(Number(dirNum) === 3, 'directory number is 3')

    if (fileNum && dirNum) {
      st.kill()
      return true
    }
  })
  st.end()
})

test('prints out all of the files', function (t) {
  var st = spawn(t, dat + ' link ' + datSample + ' --home=' + tmp)
  st.stdout.match(function (output) {
    var downloadFinished = output.indexOf('dat://') > -1
    if (!downloadFinished) return false

    var fileList = output.split('\n').filter(function (line) {
      return line.indexOf('[Done]') > -1 && line.indexOf('Files Read') === -1
    })
    t.ok(fileList.length === 2, 'two files printed done')

    if (fileList.length) {
      st.kill()
      return true
    }
  })
  st.end()
})
