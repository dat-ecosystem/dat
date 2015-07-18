var config = require('../lib/util/config.js')()
var usage = require('../lib/util/usage.js')('push.txt')
var abort = require('../lib/util/abort.js')
var progress = require('../lib/util/progress.js')
var openDat = require('../lib/util/open-dat.js')
var transportStream = require('../lib/util/transports.js')
var authPrompt = require('../lib/util/auth-prompt.js')
var auth = require('../lib/util/url-auth.js')

module.exports = {
  name: 'push',
  command: handlePush,
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

function handlePush (args) {
  var remote = config.remote || args._[0]
  if (!remote) return usage()

  if (args.username && args.password) {
    remote = auth(remote, args.username, args.password)
  }

  var transports = transportStream(args.bin)

  try {
    var stream = transports(remote)
  } catch (err) {
    abort(err, args)
    return usage()
  }

  stream.on('warn', function (data) {
    console.error(data)
  })

  stream.on('error', function (err) {
    if (err.level === 'client-authentication') {
      return authPrompt(args, handlePush)
    }
    else abort(err, args)
  })

  stream.on('finish', function () {
    openDat(args, function ready (err, db) {
      if (err) return abort(err, args)
      if (args.json) return console.log(JSON.stringify({version: db.head}))
      console.error('Push completed successfully.')
      db.close()
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var push = stream.pipe(db.push())
    if (!args.json) progress(push, {verb: 'Pushed', replicate: true})
    push.pipe(stream)
  })
}
