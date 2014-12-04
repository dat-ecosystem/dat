var path = require('path')
var datPath = path.join(__dirname, '../')
var Dat = require('../')
var tape = require('tape')
var common = require('./common.js')()

function test(name, testFunction) {
  return tape(common.testPrefix + name, testFunction)
}

var tests = [
  require('./tests/cli.js'),
  require('./tests/init.js'),
  require('./tests/crud.js'),
  require('./tests/read-streams.js'),
  require('./tests/write-streams.js'),
  require('./tests/replication.js'),
  require('./tests/rest.js'),
  require('./tests/stats.js'),
  require('./tests/transformations.js')
]

var finish = require('./tests/finish.js')

var specificTestFile = process.argv[2]
var specificTest = process.argv[3]

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

if (specificTestFile) {
  var testModule = require(path.resolve(process.cwd(), specificTestFile))
  if (specificTest) testModule[specificTest](test, common)
  else testModule.all(test, common)
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
