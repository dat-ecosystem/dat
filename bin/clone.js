var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('clone.txt')
var authPrompt = require('../lib/util/auth-prompt.js')
var auth = require('../lib/util/url-auth.js')
var progress = require('../lib/util/progress.js')

var clone = require('../lib/clone.js')

module.exports = {
  name: 'clone',
  command: handleClone,
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
    }
  ]
}

function handleClone (args) {
  if (args._.length === 0) return usage()
  var source = args._[0]
  var path = args._[1] || source.replace(/\.dat$/i, '').replace(/[^\-._a-z0-9]+$/i, '').split(/[^\-._a-z0-9]/i).pop() || 'dat-' + Date.now()

  if (args.username && args.password) {
    source = auth(source, args.username, args.password)
  }

  var cloneStream = clone(source, path, args, function finished (err, db) {
    if (err) {
      if (err.level === 'client-authentication' && !args.json) {
        return authPrompt(args, handleClone)
      }
      else abort(err, args)
    }

    if (args.json) console.log(JSON.stringify({version: db.head}))
    else console.error('Clone from remote to %s has completed.', path)
  })

  progress(cloneStream, {verb: 'Cloning', replicate: true})
}
