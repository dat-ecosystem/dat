var path = require('path')
var read = require('read')

module.exports = function(dat, opts, cb) {
  dat.exists(opts, function(exists) {
    if (exists) return cb(new Error('A dat store already exists here'))
    prompt(function(err) {
      if (err) return cb(err)
      dat.init(opts, function(err, path) {
        if (err) return cb(err)
        console.log('Initialized dat store at '+path)
      })
    })
  })

  function prompt(cb) {
    if (opts.prompt === false) return cb()

    ask([
      {name: 'name', default: path.basename(process.cwd())},
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