var os = require('os')
var path = require('path')
var test = require('tape')
var csv = require('csv-parser')
var spawn = require('tape-spawn')
var fs = require('fs')
var iterate = require('stream-iterate')
var sort = require('sort-stream')

var helpers = require('./helpers')
var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)

var csvfile = path.resolve(__dirname + '/fixtures/all_hour.csv')
var exportfile = path.join(dat1, 'out.csv')

test('dat add csv', function (t) {
  var st = spawn(t, dat + ' add ' + csvfile + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

test('dat export to file', function (t) {
  var st = spawn(t, dat + ' export ' + exportfile, {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done exporting data to/)
  st.end()
})

test('dat export output matches original file', function (t) {
  t.plan(37)
  var sorter = sort(function (a, b) {
    return parseFloat(a['latitude']) < parseFloat(b['latitude'])
  })
  var original = fs.createReadStream(csvfile).pipe(csv()).pipe(sorter)
  var copied = fs.createReadStream(exportfile).pipe(csv()).pipe(sorter)

  var read = iterate(original)
  var read2 = iterate(copied)

  function loop () {
    read(function (err, line, next) {
      t.ifError(err)
      read2(function (err, line2, next2) {
        t.ifError(err)
        if (!line || !line2) return
        t.deepEquals(line, line2)
        next()
        next2()
        loop()
      })
    })
  }

  loop()

})
