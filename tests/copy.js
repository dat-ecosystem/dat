var os = require('os')
var path = require('path')
var test = require('tape')
var csv = require('csv-parser')
var spawn = require('tape-spawn')
var fs = require ('fs')
var iterate = require('stream-iterate')
var sort = require('sort-stream')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')

helpers.onedat(dat1)

var csvfile = path.resolve(__dirname + '/fixtures/all_hour.csv')
var copyfile = path.join(dat1, 'out.csv')

test('dat add csv', function (t) {
  var st = spawn(t, dat + ' add ' + csvfile + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})


test('dat copy to file', function (t) {
  var st = spawn(t, dat + ' copy ' + copyfile, {cwd: dat1})
  st.stdout.empty()
  st.stdout.match(/Done copying data to/)
  st.end()
})

test('dat copy output matches original file', function (t) {
  t.plan(9)
  var sorter = sort(function (a, b) {
    return parseFloat(a['latitude']) < parseFloat(b['latitude'])
  })
  var original = fs.createReadStream(csvfile).pipe(csv()).pipe(sorter)
  var copied = fs.createReadStream(copyfile).pipe(csv()).pipe(sorter)

  var read = iterate(original)
  var read2 = iterate(copied)

  read(function (err, line, next) {
     read2(function (err, line2, next2) {
      t.deepEquals(line, line2)
      next()
      next2()
    })
  })

})
