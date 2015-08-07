var fs = require('fs')
var url = require('url')
var got = require('got')

module.exports = function (location, cb) {
  fs.exists(location, function (exists) {
    if (exists) return cb(null, fs.createReadStream(location))
    var u = url.parse(location)
    if (u.protocol && u.protocol.match(/http/)) return cb(null, got(location))
    return cb(new Error('Could not find file.'))
  })
}
