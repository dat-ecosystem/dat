var level = require('level')
var path = require('path')
var homedir = require('os-homedir')
var hyperdrive = require('hyperdrive')

module.exports = Dat

function Dat (loc, opts) {
  if (!opts) opts = {}
  var datPath = path.join(homedir(), '.dat/db')
  return hyperdrive(level(datPath), opts)
}
