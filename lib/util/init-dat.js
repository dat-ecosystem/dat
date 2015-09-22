var path = require('path')
var fs = require('fs')
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

  function readPackage (db, cb) {
    var pkg = {}
    var fileRead = db.createFileReadStream('package.json', {dataset: 'files'})
    fileRead.pipe(concat(function (buff) {
      try {
        pkg = JSON.parse(buff)
      } catch (e) {
        // do nothing
      }
      cb(pkg)
    }))

    fileRead.on('error', function () {
      fs.readFile(path.join(args.path, 'package.json'), function (err, buff) {
        if (err) return cb(pkg)
        try {
          pkg = JSON.parse(buff)
        } catch (e) {
          // do nothing
        }
        cb(pkg)
      })
    })
  }

  function initConfigFile (db, cb) {
    readPackage(db, function (pkg) {
      if (!pkg.dat) {
        pkg.dat = {
          name: 'NA',
          description: 'NA',
          publisher: 'NA'
        } // make empty obj in config
      }

      prompt(function (err) {
        if (err) return cb(err)
        db.createFileWriteStream('package.json', {dataset: 'files'}).end(JSON.stringify(pkg, null, '  ') + '\n', cb)
      })

      function prompt (cb) {
        if (args.prompt === false) return cb()

        ask([
          {name: 'name', default: pkg.name || args.name || path.basename(process.cwd())},
          {name: 'description', default: pkg.description || args.description || 'NA'},
          {name: 'publisher', default: pkg.publisher || args.publisher || 'NA'}
        ], cb)
      }

      function ask (prompts, cb) {
        if (!prompts.length) return cb()
        var p = prompts.shift()

        read({prompt: p.name + ': ', default: p.default}, function (err, value) {
          if (err) return cb(err)
          if (value) pkg[p.name] = value
          ask(prompts, cb)
        })
      }
    })
  }
}
