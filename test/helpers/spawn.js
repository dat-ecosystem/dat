var spawn = require('tape-spawn')
var fs = require('fs')

// happens once at require time
// https://github.com/AndreasMadsen/execspawn/issues/2
var hasBash = fs.existsSync('/bin/bash')

module.exports = function (t, cmd, opts) {
  opts = opts || {}
  if (hasBash) opts.shell = '/bin/bash' // override default of /bin/sh
  return spawn(t, cmd, opts)
}
