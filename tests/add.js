var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-1')
var dat2 = path.join(tmp, 'dat-2')
var dat3 = path.join(tmp, 'dat-3')

helpers.onedat(dat1)

test('dat add csv', function (t) {
  var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')
  var st = spawn(t, dat + ' add ' + csv + ' --key=id', {cwd: dat1})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify(dat1)

helpers.onedat(dat2)

test('dat add json', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' add ' + json + ' --key=id', {cwd: dat2})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify(dat2)

function verify (dataset, datN) {
  if (!datN) {
    datN = dataset
    dataset = ''
  }
  test('dat cat', function (t) {
    var st = spawn(t, dat + ' cat --dataset=' + dataset, {cwd: datN})
    st.stderr.empty()
    st.stdout.match(function (output) {
      var lines = output.split('\n')
      t.ok('less than 10 lines', lines.length <= 10)
      if (lines.length === 10) {
        if (JSON.parse(lines[0]).key === 'ak11246285') return true
        return false
      }
    })
    st.end()
  })
}

helpers.onedat(dat3)

test('dat add all_hour to test3', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' add ' + json + ' --key=id --dataset=add-test3', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify('add-test3', dat3)

test('dat add all_hour to separate dataset', function (t) {
  var json = path.resolve(__dirname + '/fixtures/all_hour.json')
  var st = spawn(t, dat + ' add ' + json + ' --key=id --dataset=add-test4', {cwd: dat3})
  st.stdout.empty()
  st.stderr.match(/Done adding data/)
  st.end()
})

verify('add-test4', dat3)
