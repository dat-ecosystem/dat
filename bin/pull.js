var eos = require('end-of-stream')
var transportStream = require('transport-stream')
var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('pull.txt')
var progress = require('../lib/util/progress.js')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var authPrompt = require('../lib/util/auth-prompt.js')
var auth = require('../lib/util/url-auth.js')
var debug = require('debug')('dat-pull')

module.exports = {
  name: 'pull',
  command: handlePull,
  options: [
    {
      name: 'username',
      boolean: false,
      abbr: 'u'
    },
    {
      name: 'password',
      boolean: false,
      abbr: 'p'
    },
    {
      name: 'live',
      boolean: true,
      abbr: 'l'
    }
  ]
}

function handlePull (args) {
  var remote = config(args).dat.remote || args._[0]
  if (!remote) return usage()

  throw new Error('Unimplemented')
}
