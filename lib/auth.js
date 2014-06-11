var basic = require('basic')
var debug = require('debug')('auth')
var cookie = require('./cookie.js')

module.exports = Auth

function noAuth(req, res, cb) { setImmediate(cb) }

function Auth(opts) {
  var self = this
  if (!(this instanceof Auth)) return new Auth(opts)
  this.user = opts.adminUser || process.env["DAT_ADMIN_USER"]
  this.pass = opts.adminPass || process.env["DAT_ADMIN_PASS"]
  this.basic = basic(function (user, pass, callback) {
    if (user === self.user && pass === self.pass) return callback(null)
    callback(new Error("Access Denied"))
  })
  this.cookie = cookie(opts)
  this.sessions = {}
}

Auth.prototype.handle = function(req, res, cb) {
  if (!this.user || !this.pass) return noAuth(req, res, cb)
  
  var self = this
  var session = this.cookie.get(req)
  
  // user is already logged in
  if (this.sessions.hasOwnProperty(session)) {
    debug('session OK', session)
    return setImmediate(function() { cb(null, session) })
  }
  
  this.basic(req, res, function(err) {
    // user is not authorized
    if (err) {
      debug('not authorized', {header: req.headers.Authorization || req.headers.authorization, session: session})
      delete self.sessions[session]
      return cb(err)
    }
    
    // authenticate user
    var newSession = self.cookie.create(res)
    self.sessions[newSession] = new Date()
    debug('new session', newSession)
    cb(null, newSession)
  })
}

Auth.prototype.error = function(req, res) {
  var session = this.cookie.get(req)
  if (session) delete this.sessions[session]
  this.cookie.destroy(res)
  res.statusCode = 401
  res.setHeader('content-type', 'application/json')
  res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
  res.end(JSON.stringify({error: "Unauthorized", loggedOut: true}) + '\n')
}
