var level = require('level')
var path = require('path')
var homedir = require('os-homdir')
var hyperdrive = require('hyperdrive')

module.exports = Dat

function Dat (opts) {
  if (!opts) opts = {}
  var datPath = path.join(homedir(), '.dat/hyperdrive')
  return hyperdrive(level(datPath), opts)
}
