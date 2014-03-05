var http = require('http')
var url = require('url')
var Router = require("routes-router")
var concat = require('concat-stream')
var ldj = require('ldjson-stream')
var basic = require('basic')
var manifest = require('level-manifest')
var multilevel = require('multilevel/msgpack')
var debug = require('debug')('rest-handler')

module.exports = RestHandler

function RestHandler(dat) {
  if (!(this instanceof RestHandler)) return new RestHandler(dat)
  this.dat = dat
  this.auth = basicAuth(dat.opts.adminUser, dat.opts.adminPass)
  this.router = this.createRoutes()
}

RestHandler.prototype.createRoutes = function() {
  var router = Router()
  router.addRoute("/", this.hello.bind(this))
  router.addRoute("/_bulk", this.bulk.bind(this))
  router.addRoute("/_package", this.package.bind(this))
  router.addRoute("/_manifest", this.manifest.bind(this))
  router.addRoute("/_schema", this.schema.bind(this))
  router.addRoute("/_rpc", this.rpc.bind(this))
  router.addRoute("/_csv", this.csv.bind(this))
  router.addRoute("/:id", this.document.bind(this))
  router.addRoute("*", this.notFound.bind(this))
  return router
}

RestHandler.prototype.package = function(req, res) {
  this.json(res, this.dat.meta.json)
}

RestHandler.prototype.manifest = function(req, res) {
  this.json(res, manifest(this.dat.db))
}

RestHandler.prototype.rpc = function(req, res) {
  var self = this
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
    var mserver = multilevel.server(self.dat.db)
    req.pipe(mserver).pipe(res)
  })
}

RestHandler.prototype.csv = function(req, res) {
  var readStream = this.dat.createReadStream({csv: true})
  res.writeHead(200, {'content-type': 'text/csv'})
  readStream.pipe(res)
}

RestHandler.prototype.schema = function(req, res) {
  this.json(res, this.dat.meta.json)
}

RestHandler.prototype.handle = function(req, res) {
  debug(req.method + ' - ' + req.url)
  this.router(req, res)
}

RestHandler.prototype.error = function(res, status, message) {
  if (!status) status = res.statusCode
  if (message) {
    if (message.status) status = message.status
    if (typeof message === "object") message.status = status
    if (typeof message === "string") message = {error: status, message: message}
  }
  res.statusCode = status || 500
  this.json(res, message)
}

RestHandler.prototype.authError = function(req, res) {
  res.statusCode = 401
  res.setHeader("WWW-Authenticate", "Basic realm=\"Secure Area\"")
  res.end("Unauthorized\n")
}

RestHandler.prototype.notFound = function(req, res) {
  this.error(res, 404, {"error": "Not Found"})
}

RestHandler.prototype.hello = function(req, res) {
  if (req.method === "POST") return this.document(req, res)
  this.json(res, {"dat": "Hello", "version": 1, "sequence": this.dat.storage.seq})
}

RestHandler.prototype.json = function(res, json) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(json) + '\n')
}

RestHandler.prototype.get = function(req, res, opts) {
  var self = this
  this.dat.get(opts.id, url.parse(req.url, true).query || {}, function(err, json) {
    if (err && err.message === 'range not found') return self.error(res, 404, {error: "Not Found"})
    if (err) return self.error(res, 500, err.message)
    if (json === null) return self.error(res, 404, {error: "Not Found"})
    self.json(res, json)
  })
}

RestHandler.prototype.post = function(req, res) {
  var self = this
  req.on('error', function(err) {
    self.error(res, 500, err)
  })
  req.pipe(concat(function(buff) {
    var json
    if (buff) {
      try {
        json = JSON.parse(buff)
      } catch(err) {
        return self.error(res, 500, err)
      }
    }
    if (!json) return self.error(res, 500, 'no data uploaded')
    self.dat.put(json, function(err, stored) {
      if (err) {
        // if (err.conflict) return self.error(res, 409, {error: "Document update conflict. Invalid _rev"})
        return self.error(res, 500, err)
      }
      self.json(res, stored)
    })
  }))
}

RestHandler.prototype.delete = function(req, res, opts) {
  var self = this
  self.dat.delete(opts.id, function(err, stored) {
    if (err) return self.error(res, 500, err)
    self.json(res, {deleted: true})
  })
}

RestHandler.prototype.bulk = function(req, res) {
  var self = this
  var opts = {}
  var ct = req.headers['content-type']
  if (ct === 'application/json') opts.json = true
  if (ct === 'text/csv') opts.csv = true
  
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
    var writeStream = self.dat.createWriteStream(opts)
    var serializer = ldj.serialize()
    req.pipe(writeStream).pipe(serializer).pipe(res)
  })
}

RestHandler.prototype.document = function(req, res, opts) {
  var self = this
  if (req.method === "GET") return this.get(req, res, opts)
  this.auth(req, res, function(err) {
    if (err) return self.authError(req, res)
    if (req.method === "POST") return self.post(req, res, opts)
    if (req.method === "DELETE") return self.delete(req, res, opts)
  })
}

function basicAuth(adminu, adminp) {
  var adminu = adminu || process.env["DAT_ADMIN_USER"]
  var adminp = adminp || process.env["DAT_ADMIN_PASS"]
  if (!adminu || !adminp) return function noAuth(req, res, cb) { cb(null) }
  
  return basic(function (user, pass, callback) {
    if (user === adminu && pass === adminp) return callback(null)
    callback(new Error("Access Denied"))
  })
}
