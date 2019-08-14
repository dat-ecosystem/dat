const xtend = Object.assign
const RegistryClient = require('dat-registry')

module.exports = function (opts) {
  const townshipOpts = {
    server: opts.server,
    config: {
      filepath: opts.config // defaults to ~/.datrc via dat-registry
    }
  }
  const defaults = {
    // xtend doesn't overwrite when key is present but undefined
    // If we want a default, make sure it's not going to passed as undefined
  }
  const options = xtend(defaults, townshipOpts)
  return RegistryClient(options)
}
