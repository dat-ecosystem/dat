var config = require('../lib/util/config.js')()
var usage = require('../lib/util/usage.js')('pull.txt')
var progress = require('../lib/util/progress.js')
var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var transportStream = require('../lib/util/transports.js')
var authPrompt = require('../lib/util/auth-prompt.js')
var auth = require('../lib/util/url-auth.js')

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
    }
  ]
}

function handlePull (args) {
  var remote = config.remote || args._[0]
  if (!remote) return usage()

  if (args.username && args.password) {
    remote = auth(remote, args.username, args.password)
  }

  var transports = transportStream(args.bin)

  try {
    var stream = transports(remote)
  } catch (err) {
    return usage()
  }

  stream.on('warn', function (data) {
    console.error(data)
  })

  stream.on('error', function (err) {
    if (err.level === 'client-authentication' && !args.json) {
      return authPrompt(args, handlePull)
    }
    else abort(err, args)
  })

  stream.on('prefinish', function () {
    openDat(args, function ready (err, db) {
      if (err) return abort(err, args)
      if (args.json) return console.log(JSON.stringify({version: db.head}))
      var forks = 'some number of' // TODO
      var msg = ''
      msg += 'Pull completed successfully. You now have ' + forks + ' forks ;)\n'
      msg += 'Current version is now ' + db.head
      console.error(msg)
    })
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var pull = stream.pipe(db.pull())
    if (!args.json) progress(pull, {verb: 'Pulled', replicate: true})
    pull.pipe(stream)
  })
}
