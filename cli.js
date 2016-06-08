#!/usr/bin/env node
var args = require('minimist')(process.argv.splice(2), {
  alias: {p: 'port', q: 'quiet', v: 'version', s: 'static', r: 'resume'},
  boolean: ['color', 'static', 'quiet', 'version'],
  default: {color: true}
})

process.title = 'dat'

// set debug before requiring other modules
if (args.debug) {
  var debug = args.debug
  if (typeof args.debug === 'boolean') debug = '*' // default
  process.env.DEBUG = debug
}

if (args.version) {
  var pkg = require('./package.json')
  console.log(pkg.version)
  process.exit(0)
}

if (args.doctor) {
  require('./bin/doctor')(args)
} else if (args._[0] === 'share') {
  require('./bin/share')(args)
} else if (args._[0] && isDatLink(args._[0])) {
  require('./bin/download')(args)
} else {
  require('./usage')('root.txt')
}

function isDatLink (val) {
  // TODO: support dat.land link
  return val.length === 64
}
