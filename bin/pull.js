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

  if (args.username && args.password) {
    remote = auth(remote, args.username, args.password)
  }

  var transportOpts = {
    command: (args.bin || 'dat') + ' replicate -'
  }

  var transport = transportStream(transportOpts)

  try {
    var stream = transport(remote)
  } catch (err) {
    return usage()
  }

  eos(stream, function (err) {
    if (!err) return debug('stream end')
    if (err.level === 'client-authentication' && !args.json) {
      return authPrompt(args, handlePull)
    }
    else abort(err, args)
  })

  openDat(args, function ready (err, db) {
    if (err) return abort(err, args)
    var pull = db.pull({live: args.live})
    if (!args.json) {
      pull.once('progress', function () {
        progress(pull, {verb: 'Pulled', replicate: true})
      })
    }
    pull.pipe(stream).pipe(pull)
  })

  stream.on('warn', function (data) {
    console.error(data)
  })

  stream.on('finish', function () {
    openDat(args, function ready (err, db) {
      if (err) return abort(err, args)
      if (args.json) return console.log(JSON.stringify({version: db.head}))
      db.heads(function (err, heads) {
        if (err) return abort(err, args)
        var forks = heads.length
        var msg = ''
        msg += 'Pull completed successfully.' + (forks > 1 ? ' You now have ' + forks + ' forks\n' : '\n')
        msg += 'Current version is now ' + db.head
        console.error(msg)
        db.flush(function () {
          db.close()
        })
      })
    })
  })
}
