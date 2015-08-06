var fs = require('fs')
var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')

var dat = path.resolve(__dirname + '/../cli.js')
var tmpdir = require('os').tmpdir()
var dat1 = helpers.randomTmpDir()
var dat2 = helpers.randomTmpDir()
var csv = path.resolve(__dirname + '/fixtures/all_hour.csv')

helpers.onedat(dat1)

test('push-pull-clone: fs clone with bad folder should error', function (t) {
  var st = spawn(t, dat + ' clone ./does-not-exist should-not-exist-after --bin=' + dat, {cwd: tmpdir})
  st.stderr.match(/does-not-exist is not a valid directory/)
  st.stdout.empty()
  t.equal(fs.existsSync('./should-not-exist-after'), false, 'clone does not exist')
  st.end()
})

test('push-pull-clone: fs clone with bad bin should error', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' should-not-exist-after --bin=/iamnotarealprogram', {cwd: tmpdir})
  st.stderr.match(/Did not find a dat executable/)
  st.stdout.empty()
  t.equal(fs.existsSync('./should-not-exist-after'), false, 'clone does not exist')
  st.end()
})

test('push-pull-clone: fs clone with bad transport should error', function (t) {
  var st = spawn(t, dat + ' clone tacos://pizza should-not-exist-after', {cwd: tmpdir})
  st.stderr.match(/Could not figure out transport type for tacos/)
  st.stdout.empty()
  t.equal(fs.existsSync('./should-not-exist-after'), false, 'clone does not exist')
  st.end()
})

// test clone

test('push-pull-clone: dat import csv', function (t) {
  var st = spawn(t, dat + ' import ' + csv + ' -d quakes', {cwd: dat1})
  st.stderr.match(/Done importing data/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: clone dat1 into dat2', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' ' + dat2 + ' --bin=' + dat, { cwd: path.join(dat2, '..') })
  st.stderr.match(/has completed/)
  st.stdout.empty()
  st.end()
})

test('push-pull-clone: fs clone with existing dat should error', function (t) {
  var st = spawn(t, dat + ' clone ' + dat2 + ' ' + dat1 + ' --bin=' + dat, {cwd: path.join(dat1, '..')})
  st.stderr.match(/already exists/)
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

test('push-pull-clone: pull with remote set in package.json', function (t) {
  var config = {name: 'test-dat', version: '1.0.0', dat: {remote: dat1}}
  fs.writeFileSync(path.join(dat2, 'package.json'), JSON.stringify(config), 'utf8')
  var st = spawn(t, dat + ' pull ' + ' --bin=' + dat, {cwd: dat2})
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

test('push-pull-clone: pull with json output', function (t) {
  var st = spawn(t, dat + ' pull ' + ' --json --bin=' + dat, {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function (output) {
    try {
      var json = JSON.parse(output)
      return json.version.length === 64
    } catch (e) {
      return false
    }
  })
  st.end()
})

test('push-pull-clone: push with json output', function (t) {
  var st = spawn(t, dat + ' push ' + ' --json --bin=' + dat, {cwd: dat2})
  st.stderr.empty()
  st.stdout.match(function (output) {
    try {
      var json = JSON.parse(output)
      return json.version.length === 64
    } catch (e) {
      return false
    }
  })
  st.end()
})
