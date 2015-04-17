var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var through = require('through2')
var twodats = require('./twodats.js')
var conflict = require('./conflict.js')

var dat = path.resolve(__dirname + '/../cli.js')
var hashes, diff

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

twodats(function (dat1, dat2) {
  conflict(dat1, dat2, csvs, function () {
    test('dat1 heads', function (t) {
      var st = spawn(t, dat + ' heads', {cwd: dat1})
      st.stderr.empty()
      st.stdout.match(function match (output) {
        var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
        if (ok) hashes = output.split('\n')
        return ok
      })
      st.end()
    })

    test('dat1 heads', function (t) {
      var st = spawn(t, dat + ' heads', {cwd: dat1})
      st.stderr.empty()
      st.stdout.match(function match (output) {
        var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
        if (ok) hashes = output.split('\n')
        return ok
      })
      st.end()
    })

    test('dat1 diff', function (t) {
      var st = spawn(t, dat + ' diff ' + hashes.join(' '), {cwd: dat1})
      st.stderr.empty()
      st.stdout.match(function match (output) {
        try {
          diff = JSON.parse(output)
        } catch (e) {
          return false
        }
        if (diff.versions[0].value.name === 'Max' && diff.versions[1].value.name === 'MAX') return true
      })
      st.end()
    })

    test('dat1 merge', function (t) {
      var diff = spawn(t, dat + ' diff ' + hashes.join(' '), {cwd: dat1})
      var merge = spawn(t, dat + ' merge ' + hashes.join(' '), {cwd: dat1})

      diff.stdout.stream
        .pipe(through.obj(function (obj, enc, next) {
          next(null, obj.versions[0])
        }))
        .pipe(merge.stdin)

      diff.stderr.empty()
      diff.end()

      merge.stderr.empty()
      merge.stdout.empty()
      merge.end()
    })
  })
})
