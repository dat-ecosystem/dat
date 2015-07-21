var path = require('path')
var read = require('read')
var concat = require('concat-stream')
var dat = require('../../')
var debug = require('debug')('init-dat')

module.exports = function (args, cb) {
  debug('init', args.path)

  tryOpen(function (err, results, db) {
    if (err) return cb(err)
    if (args.writeConfig === false) return cb(null, results, db)
    initConfigFile(db, function (err) {
      if (err) return cb(err)
      cb(null, results, db)
    })
  })

  function tryOpen (cb) {
    var db = dat(args.path)
    db.on('error', function (err) {
      debug('db read error', err)
      create(cb)
    })
    db.on('ready', ready)

    function ready () {
      cb(null, {exists: true}, db)
    }
  }

  function create (cb) {
    var db = dat(args.path, {createIfMissing: true})

    db.on('error', function error (err) {
      cb(err)
    })

    db.on('ready', function ready () {
      cb(null, {created: true}, db)
    })
  }

  function initConfigFile (db, cb) {
    var opts = {}
    var fileRead = db.createFileReadStream('package.json', {dataset: 'files'})
    fileRead.pipe(concat(function (buff) {
      try {
        opts = JSON.parse(buff)
      } catch (e) {
        // do nothing
      }
      askUserInput()
    }))

    fileRead.on('error', function (err) {
      debug('file read error', err)
      askUserInput()
    })

    function askUserInput () {
      if (!opts.dat) opts.dat = {} // make empty obj in config

      prompt(function (err) {
        if (err) return cb(err)
        db.createFileWriteStream('package.json', {dataset: 'files'}).end(JSON.stringify(opts, null, '  ') + '\n', cb)
      })
    }

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
