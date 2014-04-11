var fs = require('fs')
var path = require('path')
var concat = require('concat-stream')
var Dat = require('../../')
var child = require('child_process')
var mkdirp = require('mkdirp')

module.exports.init = function(test, common) {
  test('CLI dat init', function(t) {
    common.destroyTmpDats(function() {
      mkdirp(common.dat1tmp, function(err) {
        t.notOk(err, 'no err')
        var dat = child.exec('dat init', {cwd: common.dat1tmp}, function (error, stdout, stderr) {
          t.ok(stdout.indexOf('Initialized dat store') > -1, 'output matches')
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
}
