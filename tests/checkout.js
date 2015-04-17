var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var harness = require('./harness.js')

var dat = path.resolve(__dirname + '/../cli.js')

var csvs = {
  a: path.resolve(__dirname + '/fixtures/a.csv'),
  b: path.resolve(__dirname + '/fixtures/b.csv'),
  c: path.resolve(__dirname + '/fixtures/c.csv')
}

harness.twodats(function (dat1, dat2) {
  harness.conflict(dat1, dat2, csvs, function (dat1, dat2) {
    test('dat1 heads', function (t) {
      var st = spawn(t, dat + ' heads', {cwd: dat1})
      st.stderr.empty()
      st.stdout.match(function match (output) {
        var ok = output.length === 130 // 32bit hash 2 in hex (64) x2 (128) + 2 newlines (130)
        return ok
      })
      st.end()
    })
  })
})
