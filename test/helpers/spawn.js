const spawn = require('tape-spawn')
const fs = require('fs')

// happens once at require time
// https://github.com/AndreasMadsen/execspawn/issues/2
const hasBash = fs.existsSync('/bin/bash')

module.exports = function (t, cmd, opts) {
  opts = opts || {}
  if (hasBash) opts.shell = '/bin/bash' // override default of /bin/sh
  return spawn(t, cmd, opts)
}
