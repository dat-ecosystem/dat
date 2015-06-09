var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var dat = path.resolve(__dirname + '/../cli.js')
var dat1 = helpers.randomTmpDir()
var dat2 = helpers.randomTmpDir()
var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')

helpers.onedat(dat1)

// test clone
test('push-pull-clone: dat import csv', function (t) {
  var st = spawn(t, dat + ' import ' + csv + ' -d quakes', {cwd: dat1})
  st.stderr.match(/Done importing data/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: clone dat1', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' ' + dat2, {cwd: path.join(dat2, '..') })
  st.stderr.match(/Clone from remote has completed/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: compare statuses after clone', function (t) {
  compareStatuses(t, dat1, dat2)
})

// test pull from remote
test('push-pull-clone: dat import dataset #2 to dat1', function (t) {
  var st = spawn(t, dat + ' import ' + csv + ' -d quakes-2', {cwd: dat1})
  st.stderr.match(/Done importing data/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: pull from dat1 to dat2 with remote set in dat.json', function (t) {
  var config = {remote: dat1}
  fs.writeFileSync(path.join(dat2, 'dat.json'), JSON.stringify(config), 'utf8')
  var st = spawn(t, dat + ' pull', {cwd: dat2})
  st.stderr.match(/Pulled/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: compare statuses after pull', function (t) {
  compareStatuses(t, dat1, dat2)
})

function compareStatuses (t, dat1, dat2) {
  // get dat1 'dat status' json
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
        t.equal(status1, output, dat2 + ' status should match ' + dat1)
        return status1 === output
      } catch (e) {}
    }, 'status1 matches status2')
    st2.end()
  })
}
