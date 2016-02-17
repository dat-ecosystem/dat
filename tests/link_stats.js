var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('./helpers/spawn.js')

var dat = path.resolve(path.join(__dirname, '..', 'cli.js'))
var tmp = os.tmpdir()
var datSample = path.join(__dirname, 'fixtures')
var fileList = []

test('prints correct file & directory stats', function (t) {
  var st = spawn(t, dat + ' link ' + datSample + ' --home=' + tmp)
  st.stdout.match(function (output) {
    var datStats = output.indexOf('Creating New Dat') > -1
    if (!datStats) return false

    var stats = output.split(':')[1]
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
    var fileDone = output.indexOf('[Done]') > -1
    if (fileDone) {
      var fileName = output.split('Done]')[1].split('\n')[0]
      fileList.push(fileName)
    }
    var downloadFinished = output.indexOf('Your Dat Link') > -1
    if (!downloadFinished) return false

    t.ok(fileList.length === 2, 'two files printed done')

    if (downloadFinished) {
      st.kill()
      return true
    }
  })
  st.end()
})
