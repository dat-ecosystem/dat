var debug = require('debug')('bin/ignore')
var Config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('ignore.txt')

module.exports = {
  name: 'ignore',
  command: handleIgnore,
  options: []
}

function handleIgnore (args) {
  debug('handleIgnore', args)
  if (args.help) return usage()
  var config = Config(args)
  config.dat.ignore = config.dat.ignore || []
  args._.map(function (ignorable) {
    if (config.dat.ignore.indexOf(ignorable) < 0) config.dat.ignore.push(ignorable)
  })
  Config.save(args, config)
}
