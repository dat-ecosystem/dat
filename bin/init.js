var path = require('path')
var abort = require('../lib/util/abort.js')
var init = require('../lib/util/init-dat.js')
var usage = require('../lib/util/usage.js')('init.txt')

module.exports = {
  name: 'init',
  command: handleInit
}

function handleInit (args) {
  if (args.help) return usage()
  init(args, function (err, results, db) {
    if (err) return abort(err, args)
    var msg
    if (results.exists) {
      msg = 'Skipping init, there is already a dat at ' + path.join(args.path, '.dat')
      if (args.json) console.error({message: msg, exists: true})
      else console.error(msg)
      process.exit(0)
    } else if (results.created) {
      msg = 'Initialized a new dat at ' + path.join(args.path, '.dat')
      if (args.json) console.error({message: msg, created: true})
      else console.error(msg)
      process.exit(0)
    }
  })
}
