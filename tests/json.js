var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')
var csvA = path.resolve(__dirname + '/fixtures/a.csv')
var dat1 = helpers.randomTmpDir()
var dat2 = helpers.randomTmpDir()

var cleanup = helpers.onedat(dat1)

// purpose of this file is to test every command with --json to ensure consistent json output
// TODO
// log
// merge
// pull
// push
// read
// replicate
// root
// serve
// write

test('json: dat checkout --json', function (t) {
  helpers.exec(dat + ' log --json --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    var first = JSON.parse(out.stdout.toString().split('\n')[0]).version
    var st = spawn(t, dat + ' checkout ' + first + ' --json --path=' + dat1, {cwd: tmp, end: false})
    st.stdout.match(new RegExp('"version":"' + first + '"'))
    st.stderr.empty()
    st.end(function () {
      helpers.exec(dat + ' checkout latest --path=' + dat1, {cwd: tmp}, function (err, out) {
        if (err) return t.ifErr(err)
        t.end()
      })
    })
  })
})

test('json: dat clone --json', function (t) {
  var st = spawn(t, dat + ' clone ' + dat1 + ' ' + dat2 + ' --json --bin=' + dat, {cwd: path.join(dat2, '..')})
  st.stdout.match(new RegExp('"cloned":true'))
  st.stderr.empty()
  st.end()
})

test('json: dat datasets --json', function (t) {
  var st = spawn(t, dat + ' datasets --json --path=' + dat1, {cwd: tmp})
  st.stdout.match('{"datasets":["files"]}\n')
  st.stderr.empty()
  st.end()
})

test('json: dat delete --json', function (t) {
  helpers.exec(dat + ' import -d foo --key=key ' + csvA + ' --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    var st = spawn(t, dat + ' delete 1 -d foo --json --path=' + dat1, {cwd: tmp})
    st.stdout.match(new RegExp('"deleted":"1"'))
    st.stderr.empty()
    st.end()
  })
})

test('json: dat destroy --json', function (t) {
  var st = spawn(t, dat + ' destroy --no-prompt --json --path=' + dat1, {cwd: tmp, end: false})
  st.stdout.match(new RegExp('"destroyed":true'))
  st.stderr.empty()
  st.end(function () {
    helpers.exec(dat + ' init --no-prompt --path=' + dat1, {cwd: tmp}, function (err, out) {
      if (err) return t.ifErr(err)
      t.end()
    })
  })
})

test('json: dat diff --json', function (t) {
  helpers.exec(dat + ' import -d foo --key=key ' + csvA + ' --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    helpers.exec(dat + ' log --json --path=' + dat1, {cwd: tmp}, function (err, out) {
      if (err) return t.ifErr(err)
      var first = JSON.parse(out.stdout.toString().split('\n')[1]).version
      var st = spawn(t, dat + ' diff ' + first + ' --json --path=' + dat1, {cwd: tmp})
      st.stdout.match(function (output) {
        var json = JSON.parse(output)
        t.same(json.key, '1')
        t.same(json.forks.length, 2)
        t.same(json.versions[0].dataset, 'foo')
        return true
      })
      st.stderr.empty()
      st.end()
    })
  })
})

test('json: dat status --json', function (t) {
  var st = spawn(t, dat + ' status --json --path=' + dat1, {cwd: tmp})
  st.stdout.match(new RegExp('"files"'))
  st.stdout.match(new RegExp('"rows"'))
  st.stderr.empty()
  st.end()
})

test('json: dat files --json', function (t) {
  var st = spawn(t, dat + ' files --json --path=' + dat1, {cwd: tmp})
  st.stdout.match('{"files":["package.json"]}\n')
  st.stderr.empty()
  st.end()
})

test('json: dat forks --json', function (t) {
  helpers.exec(dat + ' log --json --path=' + dat1, {cwd: tmp}, function (err, out) {
    if (err) return t.ifErr(err)
    var head = JSON.parse(out.stdout.toString().trim().split('\n').pop()).version
    var st = spawn(t, dat + ' forks --json --path=' + dat1, {cwd: tmp})
    st.stdout.match('{"forks":["' + head + '"]}\n')
    st.stderr.empty()
    st.end()
  })
})

test('json: dat import --json', function (t) {
  var st = spawn(t, dat + ' import -d foo --json --key=key ' + csvA + ' --path=' + dat1, {cwd: tmp})
  st.stdout.match(new RegExp('{"version":"'))
  st.stderr.empty()
  st.end()
})

test('json: dat init --json', function (t) {
  var st = spawn(t, dat + ' init --no-prompt --json --path=' + dat1, {cwd: tmp})
  st.stdout.match(new RegExp('{"message":"Re-initialized the dat at ' + dat1 + '","exists":true}'))
  st.stderr.empty()
  st.end()
})

test('json: dat keys --json', function (t) {
  var st = spawn(t, dat + ' keys -d foo --json --path=' + dat1, {cwd: tmp})
  st.stdout.match('{"keys":["1"]}\n')
  st.stderr.empty()
  st.end()
})

test('json: dat log --json', function (t) {
  var st = spawn(t, dat + ' log --json --path=' + dat1, {cwd: tmp})
  st.stdout.match(function (buf) {
    var lines = buf.split('\n')
    if (lines.length === 4) {
      for (var i = 0; i < lines.length; i++) {
        var line
        try {
          line = JSON.parse(lines[i])
        } catch (e) {
          // do nothing
        }
        if (!line) return false
        var keys = Object.keys(line)
        if (keys.indexOf('version') === -1) return false
        if (keys.indexOf('date') === -1) return false
      }
      return true
    }
  }, 'had 4 lines of json output with expected keys')
  st.stderr.empty()
  st.end()
})

test('json: cleanup', function (t) {
  cleanup()
  t.end()
})
