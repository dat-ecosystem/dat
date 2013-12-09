var path = require('path')
var datPath = path.join(__dirname, '..')
var Dat = require(datPath)
var test = require('tape')
var helpers = require(path.join(__dirname, 'helpers'))

var specificTest = process.argv[2]

if (specificTest) require('./' + path.relative(__dirname, specificTest)).all(test, Dat, helpers)
else runAll()

function runAll() {
  require('./tests/init').all(test, Dat, helpers)
  require('./tests/crud').all(test, Dat, helpers)
  require('./tests/read-streams').all(test, Dat, helpers)
  require('./tests/write-streams').all(test, Dat, helpers)
  require('./tests/replication').all(test, Dat, helpers)
  require('./tests/rest').all(test, Dat, helpers)  
}
