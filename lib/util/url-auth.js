var url = require('url')

module.exports = function (source, username, password) {
  var u = url.parse(source)
  u.auth = username + ':' + password
  var res = url.format(u)
  return res.substring(0, res.indexOf(u.path)) + ':' + u.path
}
