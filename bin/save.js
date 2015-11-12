var debug = require('debug')('bin/save')
var dirwalker = require('node-dirwalker')
var dat = require('..')
var abort = require('../lib/util/abort.js')
var config = require('../lib/util/config.js')
var usage = require('../lib/util/usage.js')('save.txt')
var messages = require('../lib/messages.js')

module.exports = {
  name: 'save',
  command: handleSave,
  options: [
    {
      name: 'message',
      boolean: false,
      abbr: 'm'
    }
  ]
}

function handleSave (args) {
  debug('handleSave', args)
  if (args.help) return usage()
  if (!args.message) return usage()

  var IGNORES = config(args).dat.ignore || []
  IGNORES.push('data.dat')
  var db = dat(args)
  var files = []

  var walker = dirwalker({defaultIgnore: IGNORES})

  walker.on('entry', function (entry) {
    files.push(entry)
  })

  walker.on('error', function (err) {
    abort(err, args)
  })

  walker.on('close', function () {
    //console.log('added', files)
    var node = {
      message: args.message,
      value: JSON.stringify(files),
      modified: Date.now()
    }
    console.log(node)
    db.append(messages.Commit.encode(node))
    console.log('Success.')
  })

  walker.walk(args.path, {recurse: true})
}
