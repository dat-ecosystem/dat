var path = require('path')
var test = require('tape')
var spawn = require('tape-spawn')
var helpers = require('./helpers')
var tmp = require('os').tmpdir()

var dat = path.resolve(__dirname + '/../cli.js')
var forks

var dat1 = path.join(tmp, 'dat-checkout-1')
var dat2 = path.join(tmp, 'dat-checkout-2')
var dataset = 'checkout-test-dataset'

helpers.twodats(dat1, dat2)
helpers.conflict(dat1, dat2, dataset, function (conflictForks) {
  forks = conflictForks
})

test('checkout: dat1 gets proper export', function (t) {
  var checkout = spawn(t, dat + ' checkout ' + forks.remotes[0], {cwd: dat1, end: false})
  checkout.stdout.match(new RegExp('Current version is now ' + forks.remotes[0]))
  checkout.stderr.empty()
  checkout.end(function () {
    var exp = spawn(t, dat + ' export -d ' + dataset, {cwd: dat1})
    exp.stdout.match(/Max/)
    exp.stderr.empty()
    exp.end()
  })
})
