var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var harness = require('./harness.js')

var dat = path.resolve(__dirname + '/../cli.js')
var hashes

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
        if (ok) hashes = output.split('\n')
        return ok
      })
      st.end()
    })

    test('dat1 checkout gets proper cat', function (t) {
      console.log(hashes[0])
      var checkout = spawn(t, dat + ' checkout ' + hashes[0], {cwd: dat1})
      checkout.stdout.match(/Checked out to/)

      var cat = spawn(t, dat + ' cat', {cwd: dat1})
      cat.stdout.match(function match (output) {
        console.log(output)
        return output
      })

      checkout.stderr.empty()
      checkout.end()

      cat.stderr.empty()
      cat.end()
    })
  })
})
