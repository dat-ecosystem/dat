var fs = require('fs')
var path = require('path')
var concat = require('concat-stream')
var Dat = require('../../')
var child = require('child_process')
var mkdirp = require('mkdirp')
var ldj = require('ldjson-stream')
var stdout = require('stdout')
var os = require('os')
var datCmd = '"' + process.execPath + '" "' + path.resolve(__dirname, '..', '..', 'cli.js') + '"'

module.exports.init = function(test, common) {
  test('CLI dat init', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = child.exec(datCmd + ' init', {cwd: common.dat1tmp}, function (error, stdout, stderr) {
          t.ok(stdout.indexOf('Initialized dat store') > -1, 'output matches')
          common.destroyTmpDats(function() {
            t.end()
          })
        })
      })
    })
  })
}

module.exports.importCSV = function(test, common) {
  test('CLI dat import csv', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        child.exec(datCmd + ' init', {cwd: common.dat1tmp}, function (error, stdo, stde) {
          t.ok(stdo.indexOf('Initialized dat store') > -1, 'init ok')
          var testCsv = path.join(os.tmpdir(), 'test.csv')
          fs.writeFileSync(testCsv, 'a,b,c\n1,2,3\n4,5,6\n7,8,9')
          var cmd = datCmd + ' import "' + testCsv + '" --csv --verbose'
          child.exec(cmd, {timeout: 20000, cwd: common.dat1tmp}, done)
          
          function done(err, stdo, stde) {
            t.notOk(err, 'no err')
            t.equals(stde.toString(), '', 'empty stderr')
            var lines = stdo.toString().split('\n')
            var rows = []
            lines.map(function(l) {
              if (l !== '') rows.push(JSON.parse(l))
            })
            t.equal(rows.length, 3)
            rows.map(function(r) { t.ok(r._id, 'row has _id') })
            common.destroyTmpDats(function() {
              t.end()
            })
          }
        })
      })
    })
  })
}

module.exports.badCommand = function(test, common) {
  test('CLI dat command that doesnt exist', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = child.exec(datCmd + ' pizza', {cwd: common.dat1tmp}, function (error, stdout, stderr) {
          console.log('stderr', stdout, stderr)
          t.ok(stderr.toString().indexOf('Command not found') > -1, 'output matches')
          common.destroyTmpDats(function() {
            t.end()
          })
        })
      })
    })
  })
}

module.exports.all = function (test, common) {
  module.exports.init(test, common)
  // module.exports.importCSV(test, common)
  module.exports.badCommand(test, common)
}