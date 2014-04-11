var path = require('path')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var tape = require('tape')
var common = require(path.join(__dirname, 'common'))()

function test(name, testFunction) {
  return tape(common.testPrefix + name, testFunction)
}

var tests = [
  require('./tests/cli'),
  require('./tests/init'),
  require('./tests/crud'),
  require('./tests/read-streams'),
  require('./tests/write-streams'),
  require('./tests/replication'),
  require('./tests/rest')
]

var finish = require('./tests/finish')

var specificTests = process.argv.slice(2, process.argv.length)

// resets any existing DB
test('setup', function(t) {
  common.destroyTmpDats(function() {
    t.end()
  })
})

if (process.env['RPC']) {
  common.rpc = true
  common.testPrefix = 'RPC: '
}

if (specificTests.length > 0) {
  specificTests.map(function(specificTest) {
    var testModule = require('./' + path.relative(__dirname, specificTest))
    testModule.all(test, common)
  })
} else {
  runAll()
  finish(test, function() {
    if (process.env['RPC']) return
    common.rpc = true
    console.log('\n Running tests again in RPC mode\n')
  })
  if (process.env['RPC']) return
  common.testPrefix = 'RPC: '
  runAll()
}

function runAll() {
  tests.map(function(t) {
    t.all(test, common)
  })
}
