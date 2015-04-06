var path = require('path')
var dat = require('dat-core')
var debug = require('debug')('bin/init')
// var read = require('read')
// var EOL = require('os').EOL

module.exports = {
  name: 'init',
  command: handleInit,
  options: [
    {
      name: 'path',
      boolean: false,
      default: process.cwd(),
      abbr: 'p'
    }
  ]
}

function handleInit (args) {
  debug('handleInit', args)
  tryOpen()
  
  function tryOpen () {
    var db = dat(args.path)
    db.on('error', create)
    db.on('ready', ready)

    function ready () {
      console.error('Skipping init, there is already a dat at', path.join(args.path, '.dat'))
    }
  }
  
  function create () {
    var db = dat(args.path, {createIfMissing: true})

    db.on('error', function error (err) {
      throw err
    })

    db.on('ready', function ready () {
      console.error('Initialized a new dat at', path.join(args.path, '.dat'))
    })
  }
}
//
// init.info = {
//    help: 'initialize a dat store here'
// }
//
// function init(dat, opts, cb) {
//   dat.exists(opts, function(exists) {
//     if (exists) return cb(new Error('Skipping dat init because there is already a dat here'))
//     prompt(function(err) {
//       if (err) return cb(err)
//       dat.init(opts, function(err, path) {
//         if (err) return cb(err)
//         console.log('Initialized dat store at ' + path)
//         cb()
//       })
//     })
//   })
//
//   function prompt(cb) {
//     if (opts.prompt === false) return cb()
//
//     ask([
//       {name: 'name', default: dat.options.name || path.basename(process.cwd())},
//       {name: 'description', default: dat.options.description},
//       {name: 'publisher', default: dat.options.publisher}
//     ], cb)
//   }
//
//   function ask(prompts, cb) {
//     if (!prompts.length) return cb()
//     var p = prompts.shift()
//
//     if (opts[p.name] !== undefined) {
//       if (opts[p.name] === false) delete opts[p.name]
//       return ask(prompts, cb)
//     }
//
//     read({prompt: p.name+': ', default: p.default}, function(err, value) {
//       if (err) return cb(err)
//       if (value) opts[p.name] = value
//       ask(prompts, cb)
//     })
//   }
//
// }