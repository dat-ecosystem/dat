var fs = require('fs')
var path = require('path')
var read = require('read')
var dat = require('../../')
var debug = require('debug')('init-dat')

var CONFIG_FILE = 'package.json'

module.exports = function (args, cb) {
  debug('init', args.path)

  initConfigFile(function (err) {
    if (err) return cb(err)
    tryOpen()
  })

  function tryOpen () {
    var db = dat(args.path)
    db.on('error', create)
    db.on('ready', ready)

    function ready () {
      cb(null, {exists: true}, db)
    }
  }

  function create () {
    var db = dat(args.path, {createIfMissing: true})

    db.on('error', function error (err) {
      cb(err)
    })

    db.on('ready', function ready () {
      cb(null, {created: true}, db)
    })
  }

  function initConfigFile (cb) {
    var configPath = path.join(args.path, CONFIG_FILE)
    var opts = {}
    try {
      var buf = fs.readFileSync(configPath)
      opts = JSON.parse(buf)
    } catch (e) {
      // do nothing
    }

    if (!opts.dat) opts.dat = {} // make empty obj in config

    prompt(function (err) {
      if (err) return cb(err)
      fs.writeFileSync(configPath, JSON.stringify(opts, null, '  '))
      cb()
    })

    function prompt (cb) {
      if (args.prompt === false) return cb()

      ask([
        {name: 'name', default: opts.name || args.name || path.basename(process.cwd())},
        {name: 'description', default: opts.description || args.description},
        {name: 'publisher', default: opts.publisher || args.publisher}
      ], cb)
    }

    function ask (prompts, cb) {
      if (!prompts.length) return cb()
      var p = prompts.shift()

      read({prompt: p.name + ': ', default: p.default}, function (err, value) {
        if (err) return cb(err)
        if (value) opts[p.name] = value
        ask(prompts, cb)
      })
    }
  }
}
