var path = require('path')
var fs = require('fs')
var cliprompt = require('cli-prompt')
var rimraf = require('rimraf')
var abort = require('../lib/util/abort.js')
var usage = require('../lib/util/usage.js')('destroy.txt')

module.exports = {
  name: 'destroy',
  command: handleDestroy
}

function handleDestroy (args) {
  if (args.help) return usage()
  var datDir = path.join(args.path, 'data.dat')
  fs.exists(datDir, function (exists) {
    if (!exists) return abort(new Error('Cannot destroy, this is not a dat repository'), args)
    if (args.prompt === false) return destroy()

    cliprompt('About to destroy ' + datDir + '. This cannot be undone. Are you sure? (y/n): ', function (answer) {
      if (answer !== 'y') return abort(new Error('Answer was not "y", skipping destroy.'), args)
      destroy()
    })

    function destroy () {
      rimraf(datDir, function (err) {
        if (err) return abort(err, args)
        if (args.json) console.log(JSON.stringify({destroyed: true}))
        else console.log('Destroyed', datDir)
      })
    }
  })
}
