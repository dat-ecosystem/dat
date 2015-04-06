var path = require('path')
var read = require('read')
var EOL = require('os').EOL

module.exports = init

init.usage = ['dat init', 'initialize dat store'].join(EOL)

init.options = [
  {
    name: 'prompt',
    default: true,
    boolean: true,
    help: 'show prompt'
  },
  {
    name: 'name', 
    help: 'name of the dat'
  },
  {
    name: 'description',
    help: 'description of the dat'
  },
  {
    name: 'publisher',
    help: 'publisher of the dat'
 }
]

init.noDat = true

function init(dat, opts, cb) {
  dat.exists(opts, function(exists) {
    if (exists) return cb(new Error('Skipping dat init because there is already a dat here'))
    prompt(function(err) {
      if (err) return cb(err)
      dat.init(opts, function(err, path) {
        if (err) return cb(err)
        console.log('Initialized dat store at ' + path)
        cb()
      })
    })
  })

  function prompt(cb) {
    if (opts.prompt === false) return cb()

    ask([
      {name: 'name', default: dat.options.name || path.basename(process.cwd())},
      {name: 'description', default: dat.options.description},
      {name: 'publisher', default: dat.options.publisher}
    ], cb)
  }

  function ask(prompts, cb) {
    if (!prompts.length) return cb()
    var p = prompts.shift()

    if (opts[p.name] !== undefined) {
      if (opts[p.name] === false) delete opts[p.name]
      return ask(prompts, cb)
    }

    read({prompt: p.name+': ', default: p.default}, function(err, value) {
      if (err) return cb(err)
      if (value) opts[p.name] = value
      ask(prompts, cb)
    })
  }

}