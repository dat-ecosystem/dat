var path = require('path')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var test = require('tape')
var common = require(path.join(__dirname, 'common'))

var specificTests = process.argv.slice(2, process.argv.length)

// resets any existing DB
test('setup', function(t) {
  common.destroyTmpDats(function() {
    t.end()
  })
})

if (specificTests.length > 0) {
  specificTests.map(function(specificTest) {
    require('./' + path.relative(__dirname, specificTest)).all(test, common)
  })
} else {
  runAll()
}

function runAll() {
  require('./tests/init').all(test, common)
  require('./tests/crud').all(test, common)
  require('./tests/read-streams').all(test, common)
  require('./tests/write-streams').all(test, common)
  require('./tests/replication').all(test, common)
  require('./tests/rest').all(test, common)  
}
