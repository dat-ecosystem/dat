var configSync = require('../lib/util/config.js')
var abort = require('../lib/util/abort.js')

module.exports = {}

module.exports.get = function (args) {
  var config = configSync(args)
  var definition = config.dat.datasets[args.dataset]
  if (!definition) abort(new Error('No schema defined for that dataset.'))
  return definition.schema
}

module.exports.put = function (args) {
  var config = configSync(args)
  if (!config.dat.datasets) config.dat.datasets = {}
  config.dat.datasets[args.dataset] = {
    schema: args.key,
    format: args.format
  }
  configSync.write(args, config)
}
