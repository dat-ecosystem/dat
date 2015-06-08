var os = require('os')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var tmp = os.tmpdir()
var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = path.join(tmp, 'dat-clone-1')
var dat2 = path.join(tmp, 'dat-clone-2')
var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')

helpers.onedat(dat1)

test('push-pull-clone: dat import csv', function (t) {
  var st = spawn(t, dat + ' import ' + csv + ' -d quakes', {cwd: dat1})
  st.stderr.match(/Done importing data/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: clone dat1', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' ' + dat2, {cwd: tmp})
  st.stderr.match(/Clone from remote has completed/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: compare statuses', function (t) {
  var st1 = spawn(t, dat + ' status --json', {cwd: dat1, end: false})
  var status1

  // get dat1 'dat status' json
  st1.stdout.match(function (output) {
    try {
      JSON.parse(output)
      status1 = output
      return true
    } catch (e) {}
  }, 'status 1 is json')

  // get dat2 'dat status' json, should be equal to dat1
  st1.end(function () {
    var st2 = spawn(t, dat + ' status --json', {cwd: dat2})
    st2.stdout.match(function (output) {
      try {
        JSON.parse(output)
        t.equal(status1, output)
        return status1 === output
      } catch (e) {}
    }, 'status1 matches status2')

    st2.end()
  })

})
