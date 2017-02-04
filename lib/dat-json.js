var fs = require('fs')
var stringKey = require('dat-encoding').toStr
var path = require('path')

module.exports = {
  read: function (dat, cb) {
    // dat.json
    // reads to dat.meta if exists
    // (TODO: move to module & validate dat.json)
    fs.readFile(datJsonFile(dat), 'utf8', function (err, body) {
      if (err) return cb(err)
      if (!body) return cb(null, {})
      var meta
      try {
        meta = JSON.parse(body)
      } catch (e) {
        return cb(new Error('Error reading the dat.json file.'))
      }
      cb(null, meta)
    })
  },
  write: function (dat, defaults, cb) {
    if (typeof defaults === 'function') {
      cb = defaults
      defaults = {}
    }
    dat.meta = {
      title: defaults.title || path.basename(dat.path),
      url: defaults.url,
      name: defaults.name,
      description: defaults.description || ''
    }
    if (dat.key) dat.meta.url = 'dat://' + stringKey(dat.key)
    fs.writeFile(datJsonFile(dat), JSON.stringify(dat.meta), cb)
  }
}

function datJsonFile (dat) {
  return path.join(dat.path, 'dat.json')
}
