var test = require('tape')
var ram = require('random-access-memory')
var Dat = require('..')

test('dat-node: require dat-node + make a dat', function (t) {
  Dat(ram, function (err, dat) {
    t.error(err, 'no error')
    t.ok(dat, 'makes dat')
    t.pass('yay')
    t.end()
  })
})
