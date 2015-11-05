var readConfig = require('./lib/util/config.js')
var graph = require('dat-graph')
var level = require('level')
var path = require('path')

module.exports = Dat

function Dat (opts) {
  if (!opts) opts = {}
  if (!opts.path) throw new Error('Path required')
  var config = readConfig({path: opts.path})
  return graph(level(path.join(opts.path, 'data.dat')))
}
