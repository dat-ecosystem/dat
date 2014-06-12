var cookie = require('cookie-cutter')
var debug = require('debug')('cookie')

module.exports = Cookie

function Cookie(options) {
  if (!(this instanceof Cookie)) return new Cookie(options)
  this.options = options
  this.name = options.name || 'dat_session'
}

Cookie.prototype.create = function(res) {
  var id = createId()
  var targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + (this.options.expires || 14))
  var cookieVal = this.name + '='+ id + '; Path=/; HttpOnly; Expires=' + targetDate.toUTCString()
  res.setHeader('Set-Cookie', cookieVal)
  debug('create', cookieVal)
  return id
}

Cookie.prototype.get = function(req) {
  var session = cookie(req.headers.cookie).get(this.name)
  debug('get', session)
  return session
}

Cookie.prototype.destroy = function(res) {
  debug('destroy')
  res.setHeader('Set-Cookie', this.name + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT')
}

function createId () {
  var s = ''
  for (var i = 0; i < 4; i++) {
    s += Math.floor(Math.pow(16,8) * Math.random()).toString(16)
  }
  return s
}
