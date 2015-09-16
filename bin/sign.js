var debug = require('debug')('bin/sign')
var path = require('path')
var signer = require('ssh-signer')
var peek = require('peek-stream')

var abort = require('../lib/util/abort.js')
var openDat = require('../lib/util/open-dat.js')
var usage = require('../lib/util/usage.js')('sign.txt')
var configSync = require('../lib/util/config.js')

module.exports = {
  name: 'sign',
  command: handleSign,
  options: [
    {
      name: 'keyPath',
      boolean: false,
      abbr: 'k'
    }
  ]
}

function handleSign (args) {
  debug('handleSign', args)
  var keyPath = path.resolve(args.keyPath || path.join(process.env.HOME, '.ssh/id_rsa'))

  if (args.help) return usage()

  var opts = {
    alg: 'RSA-SHA256',
    hash: 'base64'
  }

  openDat(args, function (err, db) {
    if (err) abort(err, args)

    var stream = db.createChangesStream(args)
    var peeker = peek(function (data, swap) {
      if (!data.root) abort(new Error('Root not found.'), args)
      var signature = signer.signPrivateKey(data.version, keyPath, opts)
      var config = configSync(args)
      if (!config.dat.signatures) config.dat.signatures = []
      if (config.dat.signatures.indexOf(signature) === -1) {
        config.dat.signatures.push(signature)
        configSync.write(args, config)
      }
    })
    stream.pipe(peeker)
  })
}
